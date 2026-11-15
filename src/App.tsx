import { CameraView } from './ui/CameraView';

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          ASL Fingerspelling Practice Coach
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: '#475569', fontSize: '0.9rem' }}>
          100% local processing — webcam video never leaves your device.
        </p>
      </header>

      <CameraView />
    </main>
  );
}
