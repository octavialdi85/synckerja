import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-destructive">404</CardTitle>
          <CardDescription className="text-lg">Page not found</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            The page "{location.pathname}" doesn't exist.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/">Return to Home</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">Go to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
