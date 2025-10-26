const AuthTestimonialsPanel = () => {
  return <div className="auth-left-panel flex-1 flex flex-col justify-center px-8 lg:px-16">
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-8">
          Consistent top-tier performance
        </h2>
        
        {/* Performance Badges */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="text-center">
            <div className="auth-testimonial-badge best mb-2">
              BEST
            </div>
            <div className="text-sm text-slate-600">
              <div className="font-semibold">Best Support</div>
              <div className="text-xs text-slate-500">WINTER 2024</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="auth-testimonial-badge lead mb-2">
              LEAD
            </div>
            <div className="text-sm text-slate-600">
              <div className="font-semibold">Leader</div>
              <div className="text-xs text-slate-500">2024</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="auth-testimonial-badge easy mb-2">
              EASY
            </div>
            <div className="text-sm text-slate-600">
              <div className="font-semibold">Easiest To Use</div>
              <div className="text-xs text-slate-500">WINTER 2024</div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="space-y-6">
          <div className="auth-testimonial-quote blue">
            <p className="text-slate-700 font-medium mb-2">
              "A Game-Changer for Performance Management."
            </p>
            <p className="text-sm text-slate-500">- Resa Linda, Corporate HR Manager</p>
          </div>

          <div className="auth-testimonial-quote orange">
            <p className="text-slate-700 font-medium mb-2">"ProfitLoop is the best OKR tool on the market."</p>
            <p className="text-sm text-slate-500">- Agus, Chief Technology Officer</p>
          </div>

          <div className="auth-testimonial-quote blue">
            <p className="text-slate-700 font-medium mb-2">"Versatile system, and with great support from the ProfitLoop team."</p>
            <p className="text-sm text-slate-500">- Veronica, Head of Human Capital</p>
          </div>
        </div>
      </div>
    </div>;
};
export { AuthTestimonialsPanel };