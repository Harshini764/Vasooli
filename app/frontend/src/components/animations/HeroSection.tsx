import { ArrowRight, Zap } from 'lucide-react';
import GlitterWrap from './GlitterWrap';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Glitter Background */}
      <div className="absolute inset-0 h-[500px] w-full">
        <GlitterWrap
          particleCount={600}
          color1="#ffffff"
          color2="#c7d2fe"
          color3="#a5b4fc"
          speed={4}
          density={80}
          starSize={15}
          focalDepth={12}
          turbulence={0.5}
          brightness={80}
          glitterIntensity={4}
          trailAmount={90}
          reverse={false}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 h-[500px] w-full bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        <div
          className={`text-center transform transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-blue-500/10 px-4 py-2 ring-1 ring-inset ring-indigo-500/20">
            <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Smart Payment Recovery
            </span>
          </div>

          {/* Main Heading with Gradient Text */}
          <h1 className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="block text-foreground mb-2">Recover Failed</span>
            <span className="block bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
              Payments Instantly
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Automated recovery engine with intelligent retry logic, customer communication, and real-time insights
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/cases')}
              className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:from-indigo-700 hover:to-blue-700 active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button 
              onClick={() => navigate('/insights')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 px-8 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-all duration-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 active:scale-95"
            >
              <span>View Demo</span>
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 sm:gap-8">
            {[
              { label: 'Recovery Rate', value: '94%', accent: 'from-indigo-600' },
              { label: 'Processing Speed', value: '< 2s', accent: 'from-blue-600' },
              { label: 'Active Merchants', value: '500+', accent: 'from-violet-600' },
            ].map((stat, i) => (
              <div
                key={i}
                className={`transform transition-all duration-700 ${
                  isLoaded
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95'
                }`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${stat.accent} to-blue-600 bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
