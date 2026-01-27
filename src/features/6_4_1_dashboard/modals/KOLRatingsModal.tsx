import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { KOLProfileWithStats } from '@/hooks/useKOLManagementData';
import { useKOLRatings } from '@/hooks/organized/utils';

interface KOLRatingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kol: KOLProfileWithStats | null;
}

export const KOLRatingsModal: React.FC<KOLRatingsModalProps> = ({ isOpen, onClose, kol }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { addRating } = useKOLRatings();

  const handleSubmit = async () => {
    if (!kol || rating === 0) return;

    try {
      await addRating.mutateAsync({
        kol_id: kol.id,
        rating: rating,
        comment: comment,
      });
      onClose();
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error adding rating:', error);
    }
  };

  if (!kol) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rate {kol.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* KOL Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KOL Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold">{kol.name}</h3>
                  <p className="text-sm text-gray-600">@{kol.username}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-sm text-gray-600">
                    {kol.total_followers?.toLocaleString()} followers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating Input */}
          <div className="space-y-4">
            <Label htmlFor="rating">Rating (1-5 stars)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 rounded ${
                    star <= rating
                      ? 'text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star className="h-8 w-8 fill-current" />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience working with this KOL..."
              rows={4}
            />
          </div>

          {/* Quick Feedback */}
          <div className="space-y-2">
            <Label>Quick Feedback</Label>
            <div className="flex gap-4">
              <Button
                variant={comment.includes('Professional') ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (comment.includes('Professional')) {
                    setComment(comment.replace('Professional, ', ''));
                  } else {
                    setComment('Professional, ' + comment);
                  }
                }}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Professional
              </Button>
              <Button
                variant={comment.includes('Creative') ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (comment.includes('Creative')) {
                    setComment(comment.replace('Creative, ', ''));
                  } else {
                    setComment('Creative, ' + comment);
                  }
                }}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Creative
              </Button>
              <Button
                variant={comment.includes('Reliable') ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (comment.includes('Reliable')) {
                    setComment(comment.replace('Reliable, ', ''));
                  } else {
                    setComment('Reliable, ' + comment);
                  }
                }}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Reliable
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={rating === 0 || addRating.isPending}
            >
              {addRating.isPending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
