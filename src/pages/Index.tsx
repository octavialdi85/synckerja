import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to Your App
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Start your journey by signing in or creating a new account
          </p>
        </div>
        <Link to="/auth">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all text-lg px-8 py-6"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
