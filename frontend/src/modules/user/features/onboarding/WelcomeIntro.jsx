import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const slides = [
  {
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
    title: "Join India's Pet Community",
    desc: "Events, vets, tips & a tribe of pet parents who get it. Welcome to the pack!"
  },
  {
    image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80",
    title: "Find Playdates Nearby",
    desc: "Swipe, match, and meet local dogs for a fun playdate. Socializing made easy."
  },
  {
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
    title: "Expert Vet Services",
    desc: "Book appointments with top-rated veterinarians in your area with just a tap."
  }
];

export function WelcomeIntro() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      navigate('/onboarding/step1');
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/step1');
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary w-full absolute inset-0 z-50 animate-in fade-in duration-500">
      {/* Top Bar with Skip */}
      <div className="flex justify-end p-4 pt-6">
        <button 
          onClick={handleSkip} 
          className="text-text-secondary font-medium text-sm px-4 py-2 hover:text-text-primary transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Carousel Content */}
      <div className="flex-1 flex flex-col items-center px-6 overflow-hidden">
        {/* Image Container */}
        <div className="w-full max-w-sm aspect-[4/5] mt-4 mb-8 rounded-[40px] overflow-hidden shadow-2xl relative bg-bg-secondary">
          {slides.map((slide, index) => (
            <img 
              key={index}
              src={slide.image} 
              alt={slide.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out",
                currentSlide === index ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
              )}
            />
          ))}
        </div>

        {/* Text Content */}
        <div className="text-center mb-10 w-full max-w-sm relative h-32">
          {slides.map((slide, index) => (
            <div 
              key={index}
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-start transition-all duration-500",
                currentSlide === index ? "opacity-100 translate-x-0" : 
                currentSlide > index ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"
              )}
            >
              <h2 className="text-3xl font-black text-text-primary mb-4 leading-tight whitespace-pre-line">
                {slide.title.replace(" Pet", "\nPet")}
              </h2>
              <p className="text-text-secondary text-[15px] leading-relaxed max-w-[280px]">
                {slide.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between px-8 pb-12 w-full max-w-sm mx-auto">
        {/* Pagination Dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <div 
              key={index} 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                currentSlide === index ? "w-6 bg-accent-teal" : "w-2 bg-border-light"
              )}
            />
          ))}
        </div>

        {/* Next / Get Started Button */}
        <Button 
          onClick={handleNext}
          className="rounded-full px-8 py-3.5 shadow-lg shadow-primary-main/30"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
