import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EFFORT_QUOTES } from './constants';
import { RefreshCw, Twitter, Download, Check, Plus, Share } from 'lucide-react';
import { toPng } from 'html-to-image';

const ACTIVITIES = ["勉強", "仕事", "作業", "家事"];

export default function App() {
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFinished, setIsFinished] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("勉強");
  const [otherActivity, setOtherActivity] = useState<string>("");
  const [isOther, setIsOther] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copying" | "done">("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsFinished(true);
      const randomIndex = Math.floor(Math.random() * EFFORT_QUOTES.length);
      setQuote(EFFORT_QUOTES[randomIndex]);
    }
  }, [timeLeft]);

  const resetTimer = () => {
    setTimeLeft(10);
    setIsFinished(false);
    setQuote(null);
    setIsOther(false);
    setOtherActivity("");
    setSelectedActivity("勉強");
    setShareStatus("idle");
    setShowIosGuide(false);
  };

  const currentActivity = isOther ? otherActivity : selectedActivity;

  const handleShare = async () => {
    if (!cardRef.current || isGenerating) return;
    
    setIsGenerating(true);
    setShareStatus("copying");
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'do.png', { type: 'image/png' });
      const shareText = `今から${currentActivity}します！\n\n#10SECDO #10秒タイマー`;
      const shareUrl = window.location.href;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '10秒Do！',
          text: shareText + '\n' + shareUrl,
        });
        setShareStatus("done");
      } else {
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          setShareStatus("done");
        } catch (clipboardErr) {
          const link = document.createElement('a');
          link.download = `do.png`;
          link.href = dataUrl;
          link.click();
        }

        const text = encodeURIComponent(shareText);
        const url = encodeURIComponent(shareUrl);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
      }
    } catch (err) {
      console.error('Failed to share', err);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setShareStatus("idle"), 3000);
    }
  };

  const handleInstall = async () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIos) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: '10SECDO',
            text: '10SECDOはあなたの努力を応援する10秒タイマーです。',
            url: window.location.href,
          });
        } catch (err) {
          console.log('Share cancelled or failed', err);
          setShowIosGuide(true);
        }
      } else {
        setShowIosGuide(true);
      }
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // For browsers that don't support beforeinstallprompt or already installed
      alert("ブラウザのメニューから「ホーム画面に追加」を選択してください。");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans text-slate-900 overflow-x-hidden">
      {/* iOS Guide Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
            onClick={() => setShowIosGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-3xl p-8 text-center space-y-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Plus size={32} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">ホーム画面に追加</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Safariのメニューから<br />
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 mx-1">
                    <Share size={14} className="mr-1" /> 共有
                  </span>
                  をタップし、<br />
                  <span className="font-bold text-slate-900">「ホーム画面に追加」</span><br />
                  を選択してください。
                </p>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Share Card for Image Generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={cardRef}
          className="w-[600px] h-[600px] bg-white flex flex-col items-center justify-center p-12 text-center"
        >
          <div className="text-8xl font-black text-blue-600 tracking-tighter mb-12">
            Do！
          </div>
          <div className="space-y-6">
            <p className="text-4xl font-bold leading-tight text-slate-900">
              {quote?.text}
            </p>
            <p className="text-2xl text-slate-500 font-medium">
              — {quote?.author}
            </p>
          </div>
          <div className="mt-16 text-slate-300 font-bold tracking-widest text-xl">
            10SEC DO！
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div
              key="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="text-9xl font-black tabular-nums tracking-tighter">
                {timeLeft}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center space-y-12 text-center w-full"
            >
              <div className="space-y-12">
                <div className="text-[10px] text-slate-400 font-bold tracking-wider">
                  10SECDOはあなたの努力を応援する10秒タイマーです。
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-9xl font-black text-blue-600 tracking-tighter"
                >
                  Do！
                </motion.div>
                
                <div className="space-y-6 max-w-xl mx-auto">
                  <p className="text-3xl md:text-4xl font-bold leading-tight">
                    {quote?.text}
                  </p>
                  <p className="text-lg text-slate-500 font-medium">
                    — {quote?.author}
                  </p>
                </div>
              </div>

              {/* Share Section */}
              <div className="w-full max-w-md bg-slate-50 rounded-3xl p-8 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    今から何をしますか？
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {ACTIVITIES.map((act) => (
                      <button
                        key={act}
                        onClick={() => {
                          setSelectedActivity(act);
                          setIsOther(false);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                          !isOther && selectedActivity === act
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsOther(true)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        isOther
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      その他
                    </button>
                  </div>
                  
                  {isOther && (
                    <motion.input
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="text"
                      placeholder="例：読書、筋トレ"
                      value={otherActivity}
                      onChange={(e) => setOtherActivity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none transition-colors text-center font-bold"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleShare}
                    disabled={isGenerating || (isOther && !otherActivity)}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center space-x-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
                      shareStatus === "done" ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {isGenerating ? (
                      <RefreshCw className="animate-spin" size={20} />
                    ) : shareStatus === "done" ? (
                      <>
                        <Check size={20} />
                        <span>頑張れ！</span>
                      </>
                    ) : (
                      <>
                        <Twitter size={20} fill="currentColor" />
                        <span>Xに投稿する</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  {navigator.share ? 
                    "※共有メニューからXを選択してください。" : 
                    "※画像がクリップボードにコピーされます。Xで「貼り付け」してください。"}
                </p>
              </div>

              <button
                onClick={handleInstall}
                className="w-full max-w-md py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 bg-white text-slate-900 border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
              >
                <Plus size={20} />
                <span>ホーム画面に追加すれば次も頑張れる！</span>
              </button>

              <button
                onClick={resetTimer}
                className="p-4 text-slate-300 hover:text-blue-500 transition-colors"
                aria-label="Restart"
              >
                <RefreshCw size={32} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
