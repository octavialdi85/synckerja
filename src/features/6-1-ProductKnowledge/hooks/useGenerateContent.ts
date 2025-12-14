import { useState } from 'react';
import { generateProductKnowledgeContent, GenerateContentRequest, GenerateContentResponse } from '../services/chatgptService';
import { ProductKnowledge } from './useProductKnowledge';

interface UseGenerateContentReturn {
  isGenerating: boolean;
  generateContent: (item: ProductKnowledge) => Promise<GenerateContentResponse | null>;
}

export const useGenerateContent = (): UseGenerateContentReturn => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateContent = async (item: ProductKnowledge): Promise<GenerateContentResponse | null> => {
    setIsGenerating(true);
    
    try {
      const request: GenerateContentRequest = {
        feature_name: item.feature_name,
        service_name: item.service_name || undefined,
        sub_service_name: item.sub_service_name || undefined,
        problems_solved: item.problems_solved?.length > 0 ? item.problems_solved : undefined,
        existing_description: item.feature_description || undefined,
        target_audience: item.target_audience
      };

      const result = await generateProductKnowledgeContent(request);
      return result;
    } catch (error) {
      console.error('Error in generateContent hook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateContent
  };
};
