import React, { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useControls, button, folder } from 'leva';

const Recorder: React.FC = () => {
  const { gl } = useThree();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);

  const startRecording = () => {
    if (isRecordingRef.current) return;

    try {
      const canvas = gl.domElement;
      // @ts-ignore - captureStream is standard on HTMLCanvasElement but TS might complain depending on lib
      const stream = canvas.captureStream(60) as MediaStream;
      
      // Prefer VP9 for better compression, fallback to default
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `voxel-flame-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start();
      mediaRecorder.current = recorder;
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (e) {
      console.error('Recording failed to start', e);
      alert('Screen recording is not supported by this browser or requires context permissions.');
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current || !mediaRecorder.current) return;
    mediaRecorder.current.stop();
    isRecordingRef.current = false;
    setIsRecording(false);
  };

  useControls({
    Recording: folder({
      'Start Recording': button(() => startRecording(), { disabled: isRecording }),
      'Stop & Save': button(() => stopRecording(), { disabled: !isRecording }),
      Status: {
        value: isRecording ? '🔴 REC' : '⚪ Idle',
        editable: false,
      }
    }, { collapsed: false })
  }, [isRecording]);

  return null;
};

export default Recorder;