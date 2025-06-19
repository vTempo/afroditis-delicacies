import React from 'react';
import Header from '@/assets/header.png';
import Footer from '@/assets/footer.png';


const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="w-full h-16 bg-gray-100 shadow-md flex items-center justify-center">
        {/* Add your header content here */}
        <h1 className="text-2xl font-bold">Afroditi's Delicacies</h1>
      </header>

      <main className="w-full">
        <div className="relative w-full overflow-hidden">
          <div className="flex transition-transform ease-in-out duration-700 animate-slide">
            {/* <div className="w-full flex-shrink-0">
              <img src="img/food/temp1.png" className="w-full object-cover" alt="slide 1" />
            </div>
            <div className="w-full flex-shrink-0">
              <img src="img/food/temp2.png" className="w-full object-cover" alt="slide 2" />
            </div>
            <div className="w-full flex-shrink-0">
              <img src="img/food/temp3.png" className="w-full object-cover" alt="slide 3" />
            </div> */}
          </div>
        </div>
      </main>

      <footer className="w-full h-16 bg-gray-100 flex items-center justify-center mt-4">
        {/* Add your footer content here */}
        <p className="text-sm text-gray-500">&copy; 2025 Afroditi's Delicacies</p>
      </footer>
    </div>
  );
};

export default Home;
