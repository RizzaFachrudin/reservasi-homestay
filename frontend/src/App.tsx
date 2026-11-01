import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cream">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-ink">
            Homestay Reservation System
          </h1>
          <p className="mt-4 text-sage-dark">
            System sedang dalam tahap pengembangan...
          </p>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
