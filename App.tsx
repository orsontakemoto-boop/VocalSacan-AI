
import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioAnalyzer } from './services/audioAnalyzer';
import { analyzeAudioWithGemini } from './services/geminiService';
import { speakSequence } from './services/ttsService';
import Spectrogram from './components/Spectrogram';
import { MetricsDisplay } from './components/MetricsDisplay';
import { AnalysisStatus, AudioMetrics } from './types';
import { Mic, Square, Activity, Cpu, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const analyzer = new AudioAnalyzer();

export default function App() {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [metrics, setMetrics] = useState<AudioMetrics>({ pitch: 0, volume: -100, clarity: 0, f1: 0, f2: 0 });
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [instructionText, setInstructionText] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);

  // Armazenamento de dados para cálculo de média
  const collectedMetricsRef = useRef<{pitches: number[], f1s: number[], f2s: number[]}>({
    pitches: [],
    f1s: [],
    f2s: []
  });

  const updateMetrics = useCallback(() => {
    if (status === AnalysisStatus.RECORDING) {
      const pitch = analyzer.getPitch();
      const volume = analyzer.getVolume();
      const { f1, f2 } = analyzer.getFormants();
      const freqData = analyzer.getFrequencyData();
      
      // Armazena valores válidos para média
      if (pitch > 50 && volume > -40) { // Ignora silêncio/ruído
         collectedMetricsRef.current.pitches.push(pitch);
         if (f1 > 0) collectedMetricsRef.current.f1s.push(f1);
         if (f2 > 0) collectedMetricsRef.current.f2s.push(f2);
      }

      setMetrics({ pitch, volume, clarity: 0, f1, f2 });
      setFrequencyData(new Uint8Array(freqData));
      
      animationRef.current = requestAnimationFrame(updateMetrics);
    }
  }, [status]);

  useEffect(() => {
    if (status === AnalysisStatus.RECORDING) {
      updateMetrics();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status, updateMetrics]);

  const handleStartProcess = async () => {
    try {
      setGeminiAnalysis(null);
      await analyzer.start(); 
      analyzer.stop(); 

      setStatus(AnalysisStatus.GUIDING);
      
      // Reseta métricas coletadas
      collectedMetricsRef.current = { pitches: [], f1s: [], f2s: [] };

      await speakSequence([
        { text: "Olá. Para a análise, respire fundo.", rate: 1.05, pitch: 1.1 },
        { text: "Diga seu nome completo.", rate: 1.05, pitch: 1.1 },
        { text: "Sustente a vogal: 'Áh', por 5 segundos.", rate: 1.0, pitch: 1.1 }
      ], (text) => {
        setInstructionText(text);
      });

      setInstructionText(""); 
      startRecording();
    } catch (err) {
      console.error("Erro ao iniciar:", err);
      alert("Erro ao iniciar. Verifique as permissões de microfone.");
      setStatus(AnalysisStatus.IDLE);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await analyzer.start();
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start();
      setStatus(AnalysisStatus.RECORDING);
    } catch (err) {
      console.error("Error starting audio:", err);
      alert("Erro ao acessar microfone. Verifique as permissões.");
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      analyzer.stop();
      setStatus(AnalysisStatus.PROCESSING);

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await performGeminiAnalysis(blob);
      };
    }
  };

  const calculateAverage = (arr: number[]) => {
      if (arr.length === 0) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const performGeminiAnalysis = async (audioBlob: Blob) => {
    try {
      // Calcula médias dos dados coletados
      const avgPitch = calculateAverage(collectedMetricsRef.current.pitches);
      const avgF1 = calculateAverage(collectedMetricsRef.current.f1s);
      const avgF2 = calculateAverage(collectedMetricsRef.current.f2s);

      const result = await analyzeAudioWithGemini(audioBlob, {
          avgPitch,
          avgF1,
          avgF2
      });
      
      setGeminiAnalysis(result);
      setStatus(AnalysisStatus.COMPLETED);
    } catch (e) {
      setGeminiAnalysis("Falha na análise da IA.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-sci-fi-bg text-gray-200 p-4 md:p-8 font-sans selection:bg-sci-fi-accent selection:text-black">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sci-fi-panel border border-sci-fi-accent rounded-lg shadow-[0_0_10px_rgba(0,240,255,0.2)]">
               <Activity className="w-6 h-6 text-sci-fi-accent" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                VocalScan <span className="text-sci-fi-accent">AI</span>
              </h1>
              <p className="text-xs text-gray-500 font-mono tracking-wider">
                SISTEMA DE ANÁLISE ESPECTRAL E SEMÂNTICA
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-500">
             <span className={`w-2 h-2 rounded-full ${status === AnalysisStatus.RECORDING ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
             STATUS: {status}
          </div>
        </header>

        <main className="space-y-6">
          
          <section className="relative">
             <Spectrogram dataArray={frequencyData} isActive={status === AnalysisStatus.RECORDING} />
             
             {status === AnalysisStatus.IDLE && !geminiAnalysis && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="text-gray-600 font-mono text-sm bg-black/50 px-4 py-2 rounded border border-gray-800">
                   AGUARDANDO ENTRADA DE ÁUDIO...
                 </p>
               </div>
             )}

             {status === AnalysisStatus.GUIDING && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 animate-in fade-in">
                 <div className="p-4 rounded-full bg-sci-fi-secondary/20 border border-sci-fi-secondary mb-4 animate-pulse">
                   <Volume2 className="w-10 h-10 text-sci-fi-secondary" />
                 </div>
                 <p className="text-sci-fi-secondary font-mono text-lg font-bold tracking-widest mb-4">
                   INSTRUINDO...
                 </p>
                 <p className="text-white text-xl md:text-2xl font-medium text-center px-4 max-w-2xl leading-relaxed animate-in slide-in-from-bottom-2">
                   "{instructionText}"
                 </p>
               </div>
             )}
          </section>

          <MetricsDisplay metrics={metrics} />

          <div className="flex justify-center gap-6 py-4">
            {status === AnalysisStatus.RECORDING ? (
              <button 
                onClick={stopRecording}
                className="group relative px-8 py-4 bg-red-900/20 border border-red-500 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center gap-3 font-bold tracking-wider"
              >
                <span className="absolute inset-0 rounded-full border border-red-500 opacity-50 animate-ping group-hover:animate-none"></span>
                <Square className="w-5 h-5 fill-current" />
                PARAR ANÁLISE
              </button>
            ) : (
              <button 
                onClick={handleStartProcess}
                disabled={status === AnalysisStatus.PROCESSING || status === AnalysisStatus.GUIDING}
                className={`px-8 py-4 rounded-full border flex items-center gap-3 font-bold tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.15)]
                  ${(status === AnalysisStatus.PROCESSING || status === AnalysisStatus.GUIDING)
                    ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-sci-fi-panel border-sci-fi-accent text-sci-fi-accent hover:bg-sci-fi-accent hover:text-black hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]'
                  }`}
              >
                 {status === AnalysisStatus.PROCESSING && (
                   <>
                    <Cpu className="w-5 h-5 animate-spin" />
                    PROCESSANDO IA...
                   </>
                 )}
                 {status === AnalysisStatus.GUIDING && (
                   <>
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    OUÇA AS INSTRUÇÕES...
                   </>
                 )}
                 {(status === AnalysisStatus.IDLE || status === AnalysisStatus.COMPLETED || status === AnalysisStatus.ERROR) && (
                   <>
                    <Mic className="w-5 h-5" />
                    INICIAR EXAME
                   </>
                 )}
              </button>
            )}
          </div>

          {geminiAnalysis && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Cpu className="w-24 h-24 text-white" />
                </div>
                
                <h2 className="text-xl text-sci-fi-accent font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
                  <span className="text-lg">✨</span> RELATÓRIO DE ANÁLISE VOCAL
                </h2>
                
                <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-gray-100 prose-li:text-gray-300 max-w-none">
                  <ReactMarkdown>{geminiAnalysis}</ReactMarkdown>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center">
                    <p className="text-xs text-gray-600 font-mono">
                      Gerado por Gemini 2.5 Flash
                    </p>
                    <button 
                      onClick={() => setGeminiAnalysis(null)}
                      className="text-xs text-sci-fi-accent hover:underline"
                    >
                      Limpar Resultado
                    </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
