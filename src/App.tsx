
import AudioPhrasePlayer from "./components/AudioPhrasePlayer";

function App  ()  {
  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">Фразовый аудио плеер</h1>
      <AudioPhrasePlayer />
    </div>
  );
}

export default App;