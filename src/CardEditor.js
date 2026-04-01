import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';

const VIRTUAL_BOX = { width: 750, height: 1050 };

const CardEditor = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(null);
  const baseScaleRef = useRef(1);
  const initialZoomRef = useRef(1);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: false,
      preserveObjectStacking: true,
      backgroundColor: '#ffffff',
      stopContextMenu: true
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      const currentWidth = containerRef.current.offsetWidth;
      const scale = currentWidth / VIRTUAL_BOX.width;
      baseScaleRef.current = scale;
      canvas.setZoom(scale);
      canvas.setDimensions({
        width: VIRTUAL_BOX.width * scale,
        height: VIRTUAL_BOX.height * scale
      });
      canvas.renderAll();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 初始化占位符
    const placeholder = new fabric.Rect({
      left: VIRTUAL_BOX.width / 2,
      top: 525,
      originX: 'center',
      originY: 'center',
      width: 600,
      height: 800,
      fill: '#f8f9fa',
      stroke: '#dee2e6',
      strokeWidth: 2,
      strokeDashArray: [10, 5],
      isPlaceholder: true,
      absolutePositioned: true,
      selectable: true,
      hasControls: false
    });
    canvas.add(placeholder);

    // 手势缩放防护
    canvas.on('touch:gesture', (e) => {
      if (e.e.touches && e.e.touches.length === 2) {
        let newZoom = initialZoomRef.current * e.scale;
        const finalZoom = Math.max(newZoom, baseScaleRef.current);
        canvas.zoomToPoint({ x: e.self.x, y: e.self.y }, Math.min(finalZoom, 3));
      }
    });

    canvas.on('touch:drag', () => { initialZoomRef.current = canvas.getZoom(); });

    canvas.on('mouse:down', (e) => {
      if (e.target && e.target.isPlaceholder) {
        setCurrentPlaceholder(e.target);
        fileInputRef.current?.click();
      }
    });

    setFabricCanvas(canvas);
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas || !currentPlaceholder) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      fabric.Image.fromURL(f.target.result, (img) => {
        const rect = currentPlaceholder;
        const scale = Math.max(rect.width / img.width, rect.height / img.height);
        const clipPath = new fabric.Rect({
          left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          originX: 'center', originY: 'center', absolutePositioned: true
        });
        img.set({
          left: rect.left, top: rect.top, originX: 'center', originY: 'center',
          scaleX: scale, scaleY: scale, clipPath: clipPath, selectable: true
        });
        fabricCanvas.remove(rect);
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        setCurrentPlaceholder(null);
      });
    };
    reader.readAsDataURL(file);
  }, [fabricCanvas, currentPlaceholder]);

  const handleSave = () => {
    const json = fabricCanvas.toJSON(['isPlaceholder', 'absolutePositioned']);
    window.parent.postMessage({ type: 'DESIGN_COMPLETE', payload: { json } }, "*");
    alert("Saved! Check Shopify Cart.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
      <div ref={containerRef} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ padding: '20px', background: '#fff', textAlign: 'center' }}>
        <button onClick={handleSave} style={{ width: '100%', padding: '15px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
          Save & Buy
        </button>
      </div>
    </div>
  );
};

export default CardEditor;
