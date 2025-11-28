import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { PPh21Calculator as PPh21CalculatorComponent } from '@/features/8-4-pph-21/components';

const PPh21Calculator = () => {
  return (
    <StandardLayout>
      <div className="h-screen bg-gray-50 flex flex-col font-sans">
        <div className="flex-1 overflow-y-auto seamless-scroll h-full px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <PPh21CalculatorComponent />
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

export default PPh21Calculator;
