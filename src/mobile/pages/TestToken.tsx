import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const TestToken = () => {
  const [token, setToken] = useState('e1c92ca4-031a-4de1-bfa3-feb9700b49f0-0984cb96-420b-422c-be1f-e8170595bef1');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testToken = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const response = await fetch(
        `https://najgdwffjhnqlogfrlqa.supabase.co/functions/v1/verify-email-token?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const text = await response.text();
      setResult(`Status: ${response.status}\nResponse: ${text}`);
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Token verification successful',
          className: "bg-success text-success-foreground"
        });
      } else {
        toast({
          title: 'Error',
          description: `Verification failed: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setResult(`Error: ${error}`);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Test Token Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Token:</label>
              <Input 
                value={token} 
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            
            <Button 
              onClick={() => setToken('a5c9a749-81fb-422c-ae8a-96cd5106f1a5-17fc52ac-efa1-4592-87fe-82e8177e4207')}
              variant="outline"
              className="w-full mb-2"
            >
              Use Latest Database Token
            </Button>
            
            <Button 
              onClick={testToken} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Token'}
            </Button>
          </div>
          
          {result && (
            <div className="mt-4">
              <label className="block text-sm mb-2">Result:</label>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestToken;