
import React, { useEffect, useRef } from 'react';

interface SpectrogramProps {
  dataArray: Uint8Array;
  isActive: boolean;
}

const Spectrogram: React.FC<SpectrogramProps> = ({ dataArray, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null) as React.MutableRefObject<HTMLCanvasElement | null>;

  useEffect(() => {
    if (!tempCanvasRef.current) {
        tempCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    if (!canvas || !tempCanvas || !isActive || dataArray.length === 0) return;

    const ctx = canvas.getContext('2d');
    const tempCtx = tempCanvas.getContext('2d');
    if (!ctx || !tempCtx) return;

    if (tempCanvas.width !== canvas.width || tempCanvas.height !== canvas.height) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
    }

    const width = canvas.width;
    const height = canvas.height;
    
    // Efeito de rolagem: desenha a imagem anterior deslocada para a esquerda
    tempCtx.drawImage(canvas, 0, 0);

    // Limpa fundo
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    // Desenha imagem deslocada (-2px)
    ctx.drawImage(tempCanvas, -2, 0);

    const sliceWidth = 2;
    const x = width - sliceWidth;
    const binCount = dataArray.length;
    
    // Desenha a nova coluna de frequência
    for (let i = 0; i < height; i++) {
        // Mapeia altura do canvas para índices de frequência (logarítmico ou linear ajustado)
        const freqIndex = Math.floor(((height - i) / height) * (binCount / 1.5));
        
        if (freqIndex < binCount) {
            const value = dataArray[freqIndex]; // Amplitude (0-255)
            
            // Renderiza apenas se houver sinal significativo
            if (value > 10) {
                let r=0, g=0, b=0;
                
                // Mapa de Cores Termográfico (Heatmap)
                // Azul Escuro (Baixo) -> Verde (Médio) -> Amarelo/Vermelho (Alto)
                
                if (value < 60) {
                   // Azul escuro para ruído de fundo
                   r = 0; g = 0; b = value * 2; 
                } else if (value < 120) {
                   // Ciano/Verde para frequências médias
                   r = 0; g = (value - 60) * 4; b = 255 - (value - 60) * 2;
                } else if (value < 180) {
                   // Amarelo para intensidade alta
                   r = (value - 120) * 4; g = 255; b = 0;
                } else {
                   // Vermelho/Branco para picos máximos
                   r = 255; g = 255 - (value - 180) * 4; b = (value - 180) * 4;
                }

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, i, sliceWidth, 1);
            }
        }
    }

  }, [dataArray, isActive]);

  return (
    <div className="relative w-full h-64 bg-sci-fi-panel border border-gray-800 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="w-full h-full object-cover"
        />
        {/* Eixos e Legendas */}
        <div className="absolute bottom-1 right-2 text-[10px] text-gray-500 font-mono">Tempo (s) &rarr;</div>
        <div className="absolute top-2 left-1 text-[10px] text-gray-500 font-mono">Freq (Hz) &uarr;</div>
        
        {/* Legenda de Cores */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 bg-black/60 p-1 rounded border border-gray-800">
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-[9px] text-gray-300">Alto dB</span>
            </div>
             <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-[9px] text-gray-300">Médio dB</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-[9px] text-gray-300">Baixo dB</span>
            </div>
        </div>
    </div>
  );
};

export default Spectrogram;
