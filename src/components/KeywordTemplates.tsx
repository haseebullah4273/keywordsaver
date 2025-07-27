import { useState } from 'react';
import { Lightbulb, Plus, Sparkles, TrendingUp, Target, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  keywords: string[];
  category: string;
}

const templates: Template[] = [
  {
    id: 'food-blog',
    name: 'Food Blog',
    description: 'Essential keywords for food and recipe content',
    icon: Coffee,
    category: 'Food & Recipes',
    keywords: [
      'easy recipes',
      'healthy recipes',
      'quick meals',
      'meal prep',
      'dinner ideas',
      'breakfast recipes',
      'dessert recipes',
      'vegetarian recipes',
      'gluten free recipes',
      'comfort food'
    ]
  },
  {
    id: 'diy-crafts',
    name: 'DIY & Crafts',
    description: 'Perfect for DIY and crafting Pinterest boards',
    icon: Sparkles,
    category: 'DIY & Crafts',
    keywords: [
      'DIY projects',
      'craft ideas',
      'handmade gifts',
      'home decor DIY',
      'easy crafts',
      'upcycling ideas',
      'craft tutorials',
      'DIY home improvement',
      'creative projects',
      'budget crafts'
    ]
  },
  {
    id: 'fashion-style',
    name: 'Fashion & Style',
    description: 'Trending fashion and style keywords',
    icon: TrendingUp,
    category: 'Fashion',
    keywords: [
      'fashion trends',
      'style inspiration',
      'outfit ideas',
      'fashion tips',
      'seasonal fashion',
      'wardrobe essentials',
      'style guide',
      'fashion accessories',
      'casual outfits',
      'work outfits'
    ]
  },
  {
    id: 'home-decor',
    name: 'Home Decor',
    description: 'Home decoration and interior design keywords',
    icon: Target,
    category: 'Home & Garden',
    keywords: [
      'home decor ideas',
      'interior design',
      'living room decor',
      'bedroom decor',
      'kitchen design',
      'home organization',
      'decorating tips',
      'home styling',
      'modern decor',
      'cozy home'
    ]
  }
];

interface KeywordTemplatesProps {
  onAddKeywords: (keywords: string[]) => void;
}

export const KeywordTemplates = ({ onAddKeywords }: KeywordTemplatesProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleUseTemplate = (template: Template) => {
    onAddKeywords(template.keywords);
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full glass-button">
          <Lightbulb className="h-4 w-4 mr-2" />
          Use Keyword Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pinterest" />
            Keyword Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="hover-lift cursor-pointer transition-all duration-300 group"
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pinterest/10 group-hover:bg-pinterest/20 transition-colors">
                    <template.icon className="h-5 w-5 text-pinterest" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-pinterest transition-colors">
                      {template.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {template.keywords.length} keywords
                  </Badge>
                  <Button 
                    variant="pinterest" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedTemplate && (
          <div className="mt-6 p-4 border rounded-lg bg-accent/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <selectedTemplate.icon className="h-4 w-4 text-pinterest" />
              {selectedTemplate.name} Keywords Preview
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {selectedTemplate.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleUseTemplate(selectedTemplate)}
                variant="pinterest"
                className="flex-1"
              >
                Add All Keywords
              </Button>
              <Button 
                onClick={() => setSelectedTemplate(null)}
                variant="outline"
              >
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};