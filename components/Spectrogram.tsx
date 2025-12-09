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
    
    tempCtx.drawImage(canvas, 0, 0);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    ctx.drawImage(tempCanvas, -2, 0);

    const sliceWidth = 2;
    const x = width - sliceWidth;
    const binCount = dataArray.length;
    
    for (let i = 0; i < height; i++) {
        const freqIndex = Math.floor(((height - i) / height) * (binCount / 1.5));
        
        if (freqIndex < binCount) {
            const value = dataArray[freqIndex];
            
            if (value > 10) {
                let r=0, g=0, b=0;
                
                if (value < 128) {
                    r = value; 
                    g = 0;
                    b = 100 + value;
                } else if (value < 200) {
                    r = 128 - (value - 128);
                    g = (value - 128) * 3;
                    b = 255;
                } else {
                    r = (value - 200) * 5;
                    g = 255;
                    b = 255;
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
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 font-mono">
            Tempo &rarr;
        </div>
        <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono">
            Freq &uarr;
        </div>
    </div>
  );
};

export default Spectrogram;