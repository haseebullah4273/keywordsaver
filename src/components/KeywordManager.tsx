import { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Upload, FileText, Copy, BarChart3, TrendingUp, Target, Sparkles, GripVertical, CheckSquare, Square, Lightbulb, Zap, Clock, Users, Archive, Check, X, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MainTarget, BulkInputResult, RelevantKeyword } from '@/types/keyword';
import { useToast } from '@/hooks/use-toast';
import { KeywordItem } from './KeywordItem';
import { cn, capitalizeWords } from '@/lib/utils';
import { BulkOperations } from './BulkOperations';
import { KeywordTemplates } from './KeywordTemplates';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface KeywordManagerProps {
  selectedTarget: MainTarget | null;
  onAddKeywords: (mainTargetId: string, keywords: string[]) => BulkInputResult;
  onRemoveKeyword: (mainTargetId: string, keyword: string) => void;
  onUpdateTarget: (id: string, updates: Partial<MainTarget>) => void;
  onToggleMainTargetDone?: (id: string) => void;
  onToggleRelevantKeywordDone?: (mainTargetId: string, keywordText: string) => void;
}

export const KeywordManager = ({
  selectedTarget,
  onAddKeywords,
  onRemoveKeyword,
  onUpdateTarget,
  onToggleMainTargetDone,
  onToggleRelevantKeywordDone,
}: KeywordManagerProps) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate keyword statistics
  const keywordStats = useMemo(() => {
    if (!selectedTarget) return null;
    
    const activeKeywords = selectedTarget.relevantKeywords.filter(kw => !kw.isDone);
    const completedKeywords = selectedTarget.relevantKeywords.filter(kw => kw.isDone);
    const totalKeywords = selectedTarget.relevantKeywords.length;
    
    const avgLength = totalKeywords > 0 
      ? Math.round(selectedTarget.relevantKeywords.reduce((sum, kw) => sum + kw.text.length, 0) / totalKeywords)
      : 0;
    
    const longestKeyword = selectedTarget.relevantKeywords.reduce(
      (longest, current) => current.text.length > longest.text.length ? current : longest,
      selectedTarget.relevantKeywords[0] || { text: '', isDone: false }
    );
    
    const shortestKeyword = selectedTarget.relevantKeywords.reduce(
      (shortest, current) => current.text.length < shortest.text.length ? current : shortest,
      selectedTarget.relevantKeywords[0] || { text: '', isDone: false }
    );

    return {
      totalKeywords,
      activeKeywords: activeKeywords.length,
      completedKeywords: completedKeywords.length,
      avgLength,
      longestKeyword: longestKeyword.text,
      shortestKeyword: shortestKeyword.text,
      daysActive: Math.floor((Date.now() - selectedTarget.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      completionRate: totalKeywords > 0 ? Math.round((completedKeywords.length / totalKeywords) * 100) : 0
    };
  }, [selectedTarget]);

  // Filter keywords to show only active ones (completed keywords are in archive)
  const displayedKeywords = useMemo(() => {
    if (!selectedTarget) return [];
    return selectedTarget.relevantKeywords.filter(kw => !kw.isDone);
  }, [selectedTarget]);

  if (!selectedTarget) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background to-accent/20">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-pinterest/20 to-pinterest-red-dark/20 rounded-full blur-xl"></div>
            <div className="relative bg-card p-6 rounded-full shadow-soft">
              <Target className="h-16 w-16 text-pinterest mx-auto float" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gradient">Ready to Target Keywords?</h3>
          <p className="text-muted-foreground mb-4">
            Select a main target keyword from the sidebar to start managing its relevant keywords and boost your Pinterest strategy.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-pinterest" />
            <span>Pinterest SEO made simple</span>
          </div>
        </div>
      </div>
    );
  }

  const handleAddSingleKeyword = () => {
    if (!newKeyword.trim()) return;

    // Parse keywords from textarea (support both line breaks and commas)
    const keywords = newKeyword
      .split(/[,\n]/)
      .map(k => capitalizeWords(k.trim()))
      .filter(k => k.length > 0);

    const result = onAddKeywords(selectedTarget.id, keywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keyword${result.added.length > 1 ? 's' : ''} added. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicate${result.duplicates.length > 1 ? 's' : ''} skipped. `;
    }

    toast({
      title: "Keywords Added",
      description: message.trim(),
    });

    setNewKeyword('');
  };

  const handleBulkAdd = () => {
    if (!bulkKeywords.trim()) return;

    const keywords = bulkKeywords
      .split('\n')
      .map(k => capitalizeWords(k.trim()))
      .filter(k => k.length > 0);

    const result = onAddKeywords(selectedTarget.id, keywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keywords added. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicates skipped. `;
    }
    if (result.skipped.length > 0) {
      message += `${result.skipped.length} empty lines skipped.`;
    }

    toast({
      title: "Bulk Import Complete",
      description: message.trim(),
    });

    setBulkKeywords('');
    setIsBulkDialogOpen(false);
  };

  const handleUpdateName = () => {
    if (editedName.trim() && editedName.trim() !== selectedTarget.name) {
      onUpdateTarget(selectedTarget.id, { name: editedName.trim() });
      toast({
        title: "Target Updated",
        description: "Main target name has been updated.",
      });
    }
    setIsEditingName(false);
  };

  const handleToggleMainTargetDone = () => {
    if (onToggleMainTargetDone) {
      onToggleMainTargetDone(selectedTarget.id);
      toast({
        title: selectedTarget.isDone ? "Target Reactivated" : "Target Completed",
        description: selectedTarget.isDone ? "Main target has been moved back to active." : "Main target has been marked as completed!",
      });
    }
  };

  const handleUpdatePriority = (priority: 'low' | 'medium' | 'high') => {
    onUpdateTarget(selectedTarget.id, { priority });
    toast({
      title: "Priority Updated",
      description: `Target priority set to ${priority}.`,
    });
  };

  const exportKeywords = () => {
    const content = `Main Target: ${selectedTarget.name}\n\nRelevant Keywords:\n${selectedTarget.relevantKeywords.map(kw => kw.text).join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const csvContent = `Main Target,Relevant Keywords\n"${selectedTarget.name}","${selectedTarget.relevantKeywords.map(kw => kw.text).join(', ')}"`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllKeywords = async () => {
    try {
      await navigator.clipboard.writeText(selectedTarget.relevantKeywords.map(kw => kw.text).join('\n'));
      toast({
        title: "Keywords Copied",
        description: "All relevant keywords have been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy keywords to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Drag and drop functions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = displayedKeywords.findIndex(kw => kw.text === active.id);
      const newIndex = displayedKeywords.findIndex(kw => kw.text === over.id);
      
      const newKeywords = arrayMove(selectedTarget.relevantKeywords, oldIndex, newIndex);
      onUpdateTarget(selectedTarget.id, { relevantKeywords: newKeywords });
      
      toast({
        title: "Keywords Reordered",
        description: "Keyword order has been updated.",
      });
    }
  };

  // Bulk operations
  const handleToggleSelect = (keyword: string, selected: boolean) => {
    setSelectedKeywords(prev => 
      selected 
        ? [...prev, keyword]
        : prev.filter(k => k !== keyword)
    );
  };

  const handleSelectAll = () => {
    setSelectedKeywords(displayedKeywords.map(kw => kw.text));
  };

  const handleDeselectAll = () => {
    setSelectedKeywords([]);
  };

  const handleDeleteSelected = () => {
    selectedKeywords.forEach(keyword => {
      onRemoveKeyword(selectedTarget.id, keyword);
    });
    setSelectedKeywords([]);
  };

  const handleCopySelected = async () => {
    try {
      await navigator.clipboard.writeText(selectedKeywords.join('\n'));
      toast({
        title: "Selected Keywords Copied",
        description: `${selectedKeywords.length} keywords copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy keywords to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleExportSelected = () => {
    const content = `Selected Keywords from: ${selectedTarget.name}\n\n${selectedKeywords.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_selected_keywords.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditKeyword = (oldKeyword: string, newKeyword: string) => {
    const keywords = [...selectedTarget.relevantKeywords];
    const index = keywords.findIndex(kw => kw.text === oldKeyword);
    if (index !== -1) {
      keywords[index] = { ...keywords[index], text: newKeyword };
      onUpdateTarget(selectedTarget.id, { relevantKeywords: keywords });
      toast({
        title: "Keyword Updated",
        description: "Keyword has been updated successfully.",
      });
    }
  };

  const handleAddFromTemplate = (templateKeywords: string[]) => {
    const result = onAddKeywords(selectedTarget.id, templateKeywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keywords added from template. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicates skipped. `;
    }

    toast({
      title: "Template Applied",
      description: message.trim(),
    });
  };

  const handleGeneratePrompt = async () => {
    const seoPrompt = `Write a 1,500-word SEO article titled ${selectedTarget.name} recipe that is both engaging and informative. The article must be written as if you are having a friendly, informal conversation with a fellow enthusiast. Ensure that every instruction below is followed precisely, producing a final output that is dynamic, user-friendly, and thoroughly human in its tone and style.     

Style & Tone Requirements:
Conversational and Informal:
Write as if you're talking to a friend. The tone should be relaxed, engaging, and approachable.
Use everyday language; avoid overly formal or academic language.
Ensure the narrative flows naturally and doesn't sound scripted or robotic.
Occasional Sarcasm & Humor:
Inject light sarcasm and humor to keep the reader engaged. Use these elements sparingly—only enough to maintain a playful tone without overwhelming the content.
The humor should be witty and subtle; ensure it does not detract from the main points.
Personal Touch and Experience:
Include personal opinions or anecdotes where relevant. This adds authenticity and builds trust with the reader.
When describing features or comparing products, mention personal experiences to make the content more relatable.
Active Voice Only:
Write every sentence in the active voice. For example, use "I love this feature" instead of "This feature is loved by many."
Double-check your sentences to avoid any passive constructions.
Engagement Through Rhetorical Questions:
Insert rhetorical questions throughout the article to engage the reader and provoke thought. For example: "Ever wondered why this works so well?"
These questions should serve as conversation starters and not be overused.
Use of Slang & Abbreviations:
Occasionally incorporate common internet slang such as "FYI", "IMO", etc., as well as a few emoticons (e.g., ":)" or ":/").
Limit these to 2–3 instances per article to keep the content playful yet professional.

Formatting & Structural Requirements:
Introduction:
Begin with a short, punchy introduction that immediately hooks the reader.
Avoid generic openers like "In today's world.." or dive into"
The introduction should quickly address the reader's needs and set the tone for the rest of the article.
Headings and Subheadings:
Organize the article using H2 headings for each major section or point.
Use H3 headings to break down subtopics within each H2 section when necessary.
Ensure the headings are clear and descriptive to guide the reader through the content.
Paragraph Structure:
Keep paragraphs short and punchy—ideally 3–4 sentences per paragraph.
Avoid long blocks of text to ensure readability on both desktop and mobile devices.
Each paragraph should be focused and convey a single idea clearly.
Bullet Points & Lists:
When presenting technical details, features, or comparisons, use bullet points or numbered lists.
These lists should break down information in an easy-to-digest format.
Bold Key Information:
Throughout the article, bold the most important points, features, or pieces of information. This helps draw the reader's attention to the essential parts of your message.

Content and SEO Requirements:
Conciseness and Clarity:
Every sentence should contribute directly to the article's purpose. Avoid filler phrases such as "dive into" or "in modern times."
Be clear and direct—every point should have a reason for being there.
Comparative and Opinion-Based Commentary:
When comparing products, techniques, or ideas, include clear and honest comparisons that offer genuine insights.
Support your opinions with logical reasoning and, when possible, real-life examples.
SEO Optimization:
Ensure the content is optimized for SEO by naturally including relevant keywords related to ${capitalizeWords(selectedTarget.name)} recipe.
The language should be SEO-friendly without sacrificing readability or the conversational tone.
Avoid AI Fluff:
Do not include generic, AI-generated "fluff" such as overly used phrases like "dive into" or clichés.
The writing must be human, direct, and purposeful, ensuring that every word adds value.

Detailed Writing Instructions:
Introduction Section:
Open with a captivating hook. Immediately address the reader's needs or concerns related to article title
State your personal connection or experience with the topic if possible.
Main Body:
Divide the main content into multiple sections, each introduced by an H2 heading.
Within each section, use H3 subheadings where necessary to break down complex ideas.
Incorporate bullet points or numbered lists for technical details or feature comparisons.
Bold important terms, key features, or takeaways to emphasize their importance.
Tone and Engagement:
Maintain a conversational tone by writing as though you're chatting with a friend.
Use rhetorical questions throughout to encourage reader engagement.
Occasionally inject a touch of sarcasm or witty humor to make the article enjoyable without undermining its professionalism.
Sprinkle in internet slang (e.g., "FYI", "IMO") and emoticons no more than 2–3 times in the entire article.
Sentence Structure:
Write in a clear, active voice. Ensure every sentence is dynamic and direct.
Avoid complex, multi-clause sentences that might dilute the clarity of your points.
Each paragraph should be concise—aim for 3–4 sentences per paragraph to ensure readability.
Conclusion:
End with a concise summary that reiterates the key points.
Offer a final, engaging thought or call to action that encourages the reader to reflect or take the next step.
Leave the reader with a memorable final impression, perhaps by reintroducing a humorous or personal touch.

Try to include these given keywords naturally in the content:

${selectedTarget.relevantKeywords.map(kw => kw.text).join('\n')}

Word count must be over 1000 words. Make sure to increase the length of making process by going into more detail and easy wording. Don't bold the ingredients. Don't use emoji icons at all.

Also Give me 50 words short summary of recipe, ingredients list and making process list after the article. and some more engaging titles ideas under 65 characters as well`;

    try {
      await navigator.clipboard.writeText(seoPrompt);
      toast({
        title: "SEO Prompt Generated",
        description: "Customized SEO article prompt has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePinterestPrompt = async () => {
    const slugifiedKeyword = selectedTarget.name.toLowerCase().replace(/\s+/g, '-');
    const pinterestPrompt = `Create 15 high-quality, SEO-optimized Pinterest title and description for the following URL: 

https://example.com/${slugifiedKeyword}

Main Keyword: ${capitalizeWords(selectedTarget.name)}

Related Keywords to use naturally:
${selectedTarget.relevantKeywords.map(kw => kw.text).join('\n')}

Requirements:
The Title should be catchy, include relevant long-tail keywords naturally, and stay under 70 characters. 

The description must be 400-500 characters long, naturally incorporating 4-5 keywords while ensuring no word is repeated more than twice. Use bold text for keywords. 

Add one emoji in title and one in description and all add CTA in description. Also add hashtags.

Format each suggestion as:
TITLE: [Title here]
DESCRIPTION: [Description here] #hashtag1 #hashtag2 #hashtag3
---

Focus on recipe benefits, occasion-based targeting, and lifestyle aspirations.`;

    try {
      await navigator.clipboard.writeText(pinterestPrompt);
      toast({
        title: "Pinterest Prompt Generated",
        description: "Pinterest titles and descriptions prompt has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePinPowerPrompt = async () => {
    const pinPowerPrompt = `Act as a Headline Expert who understands both the core topic and various potential audience segments.

Your task is to take a single source headline and transform it into multiple targeted headlines.

Each new headline should appeal to a different audience while maintaining the main theme of the original topic.

For example if the topic is "15 Back To School Outfit Ideas"

There are many different audiences that can be targeted by using the same seed keyword and targeting different interests of people.

For example for above keyword we can make titles like:

15 Back to School Outfit Ideas Every Teen Will Love This Year
(Targeting a general teen audience)

15 Affordable Back to School Outfits Under $X – Stylish on a Budget
(Targeting budget-conscious shoppers)

15 Comfy and Trendy Back to School Looks for Busy Mornings
(Targeting parents or students who need quick, comfortable outfits)

15 Fashionable Back to School Outfits for High School Seniors
(Targeting senior students looking to make a statement)

15 Cute and Kid-Approved Back to School Outfits for Little Ones
(Targeting parents of younger children)

15 Back to School Outfits Perfect for Active Kids On the Go
(Targeting parents of active children)

15 Smart-Casual Back to School Outfit Ideas for College Students
(Targeting college students wanting a polished yet casual look)

15 Eco-Friendly Back to School Outfits – Sustainable Fashion Picks
(Targeting eco-conscious shoppers)

15 Plus-Size Back to School Outfit Ideas That Are Chic and Comfy
(Targeting plus-size teens and young adults)

15 Preppy Back to School Outfit Ideas for a Polished Look
(Targeting preppy fashion enthusiasts)

15 Trendy Back to School Outfit Ideas Inspired by Celebrities
(Targeting fashion-forward teens who follow celebrity style)

15 Athletic-Inspired Back to School Outfits for a Sporty Look
(Targeting students who prefer athletic or casual sporty styles)

Now, using this approach, please create variations on the headline "${capitalizeWords(selectedTarget.name)} Recipe" targeting different audiences. Provide a brief explanation for each variation, describing the specific audience it targets. Keep each headline under 70 characters. 

The description must be 400-500 characters long, naturally incorporating 4-5 keywords while ensuring no word is repeated more than twice. Use bold text for keywords. 

Add one emoji in title and one in description and all add CTA in description. Also, add atleast 5 hashtags. Here are some relevant keywords to add:

${selectedTarget.relevantKeywords.map(kw => kw.text).join(', ')}`;

    try {
      await navigator.clipboard.writeText(pinPowerPrompt);
      toast({
        title: "Pin Power Prompt Generated",
        description: "Headline targeting prompt has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateImagePrompt = async () => {
    const hooks = [
      "SO CREAMY & RICH!", "INCREDIBLY EASY!", "5-MINUTE MAGIC!", "ONE-BOWL WONDER!",
      "NO-FAIL METHOD!", "RESTAURANT-STYLE!", "HEALTHY & FRESH!", "QUICK & DELICIOUS!",
      "FAMILY-FAVORITE!", "INSTAGRAM-WORTHY!", "ULTIMATE COMFORT!", "INCREDIBLY TASTY!",
      "MOUTHWATERING!", "IRRESISTIBLE!", "GAME-CHANGING!", "FOOLPROOF RECIPE!",
      "MIND-BLOWING!", "HEAVENLY TASTE!", "PERFECT EVERY TIME!", "CROWD-PLEASING!",
      "SUPER SIMPLE!", "AMAZING RESULTS!", "ABSOLUTELY DIVINE!", "UNFORGETTABLE!",
      "BEST EVER!", "COMFORT FOOD!", "GOURMET STYLE!", "HOMEMADE MAGIC!",
      "FRESH & FLAVORFUL!", "SO SATISFYING!", "EASY PEASY!", "KITCHEN HACK!",
      "PRO CHEF SECRET!", "TIME-SAVING!", "BUDGET-FRIENDLY!", "ZERO-STRESS!"
    ];

    const ctas = [
      "TAP FOR THE FULL RECIPE!", "GET THE RECIPE NOW!", "TRY THIS TODAY!", "SAVE FOR LATER!",
      "PIN TO COOK LATER!", "RECIPE INSIDE!", "MUST TRY THIS!", "SO DELICIOUS!",
      "MAKE IT TONIGHT!", "YUM ALERT!", "COOK THIS NOW!", "RECIPE BELOW!",
      "DON'T MISS OUT!", "PERFECT FOR DINNER!", "WEEKEND TREAT!", "FAMILY APPROVED!",
      "QUICK MEAL SOLUTION!", "FOOD HEAVEN!", "KITCHEN MAGIC!", "TASTE TEST NOW!",
      "RECIPE GOALS!", "DINNER SORTED!", "FOODIE FAVORITE!", "COOKING MADE EASY!",
      "RECIPE WINNER!", "MUST MAKE THIS!", "DELICIOUS DISCOVERY!", "COOKING INSPIRATION!",
      "RECIPE PERFECTION!", "KITCHEN SUCCESS!", "FLAVOR BOMB!", "TASTE AMAZING!"
    ];

    const colorSchemes = [
      "warm orange and brown tones with cream accents (like lasagna)",
      "fresh green and white with natural wood tones",
      "rich red and burgundy with golden highlights",
      "elegant navy blue and cream with gold accents", 
      "warm terracotta and sage green with ivory",
      "deep purple and lavender with soft gray",
      "coral and peach with warm cream tones",
      "forest green and cream with rustic brown",
      "soft pink and cream with gold details",
      "charcoal gray and white with bright accent color"
    ];

    const textStyles = [
      "bold sans-serif for hook, clean serif for main title, simple sans-serif for CTA",
      "condensed bold for hook, elegant script for main title, clean modern for CTA", 
      "thick display font for hook, sophisticated serif for main title, handwritten for CTA",
      "modern geometric for hook, classic serif for main title, rounded sans-serif for CTA",
      "rustic slab serif for hook, refined serif for main title, casual script for CTA"
    ];

    // Generate random selections
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    const randomCta = ctas[Math.floor(Math.random() * ctas.length)];
    const randomColorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
    const randomTextStyle = textStyles[Math.floor(Math.random() * textStyles.length)];

    const imagePrompt = `Create a Pinterest pin exactly like this reference style for "${capitalizeWords(selectedTarget.name)}":

LAYOUT STRUCTURE (Copy this exact format):
- Two high-quality food images: one on top, one on bottom
- Central text overlay spanning across both images
- Pinterest aspect ratio (2:3 or 1000x1500 pixels)

TEXT OVERLAY (3-part structure):
- TOP TEXT: "${randomHook}" 
  - Bold, attention-grabbing hook text
  - Smaller than main title but prominent
  - All caps for impact
  
- MAIN TITLE: "${capitalizeWords(selectedTarget.name).toUpperCase()}"
  - Largest text element, center focus
  - Bold, easy to read font
  - Most prominent part of the design
  
- BOTTOM TEXT: "${randomCta}"
  - Call-to-action text
  - Medium size, clear and readable
  - Action-oriented language

VISUAL DESIGN:
- Color scheme: ${randomColorScheme}
- Typography style: ${randomTextStyle}
- Semi-transparent overlay background for text readability
- Text should have perfect contrast against background
- Clean, professional Pinterest pin aesthetic

FOOD PHOTOGRAPHY:
- Top image: Close-up hero shot of the finished dish
- Bottom image: Cross-section or different angle showing texture/layers
- Both images should be appetizing, well-lit, and high resolution
- Images should complement each other and the color scheme

TECHNICAL SPECS:
- Ultra-high resolution for crisp details
- Professional food photography lighting
- Clean composition with strategic white space
- Mobile-optimized text readability
- Pinterest-ready format and proportions`;

    try {
      await navigator.clipboard.writeText(imagePrompt);
      toast({
        title: "Pinterest Pin Prompt Generated",
        description: "Detailed pin prompt matching your reference style has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Flag className="h-4 w-4" />;
      case 'medium': return <Flag className="h-4 w-4" />;
      case 'low': return <Flag className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-xl font-bold"
                    onBlur={handleUpdateName}
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateName()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleUpdateName}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <h1 
                  className="text-3xl font-bold text-gradient cursor-pointer"
                  onClick={() => {
                    setIsEditingName(true);
                    setEditedName(selectedTarget.name);
                  }}
                >
                  {capitalizeWords(selectedTarget.name)}
                </h1>
              )}
              <Badge 
                variant={selectedTarget.isDone ? "secondary" : "default"}
                className={cn(
                  "text-xs",
                  selectedTarget.isDone && "bg-green-100 text-green-800"
                )}
              >
                {selectedTarget.isDone ? "Completed" : "Active"}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select 
              value={selectedTarget.priority} 
              onValueChange={handleUpdatePriority}
            >
              <SelectTrigger className="w-32">
                <div className={cn("flex items-center gap-2", getPriorityColor(selectedTarget.priority))}>
                  {getPriorityIcon(selectedTarget.priority)}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2 text-green-500">
                    <Flag className="h-4 w-4" />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <Flag className="h-4 w-4" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2 text-red-500">
                    <Flag className="h-4 w-4" />
                    High
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={selectedTarget.isDone ? "outline" : "default"}
              onClick={handleToggleMainTargetDone}
              className={cn(
                "gap-2",
                selectedTarget.isDone && "border-green-500 text-green-500 hover:bg-green-50"
              )}
            >
              {selectedTarget.isDone ? (
                <>
                  <X className="h-4 w-4" />
                  Reactivate
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Mark Done
                </>
              )}
            </Button>

          </div>
        </div>

        {/* Statistics Cards */}
        {keywordStats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="card-hover bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-xl font-bold text-primary">{keywordStats.totalKeywords}</div>
                <div className="text-xs text-muted-foreground">Total Keywords</div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-blue-500">{keywordStats.activeKeywords}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-green-500/5 to-green-600/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-green-500">{keywordStats.completedKeywords}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-orange-500/5 to-orange-600/10 border-orange-500/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-orange-500">{keywordStats.completionRate}%</div>
                <div className="text-xs text-muted-foreground">Completion</div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-yellow-500/5 to-yellow-600/10 border-yellow-500/20">
              <CardContent className="p-4 text-center">
                <Zap className="h-6 w-6 text-warning mx-auto mb-2" />
                <div className="text-xl font-bold text-warning">{Math.ceil(keywordStats.totalKeywords / 10)}</div>
                <div className="text-xs text-muted-foreground">Content Ideas</div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-purple-500/5 to-purple-600/10 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-purple-500">{selectedKeywords.length}</div>
                <div className="text-xs text-muted-foreground">Selected</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions Bar */}
        {keywordStats && keywordStats.totalKeywords > 0 && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-accent/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">Quick Stats:</span>
                <span className="ml-2 text-muted-foreground">
                  Longest: "{keywordStats.longestKeyword.slice(0, 20)}{keywordStats.longestKeyword.length > 20 ? '...' : ''}" 
                  ({keywordStats.longestKeyword.length} chars)
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllKeywords}
                className="shadow-sm"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportKeywords}
                className="shadow-sm"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        )}

        {/* Add Keywords Section */}
        {!selectedTarget.isDone && (
          <Card className="mb-6 gradient-aurora relative overflow-hidden">
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
            <CardHeader className="relative">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-pinterest" />
                Add Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              {/* Single/Multiple Keywords Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter relevant keywords (one per line or separated by commas)..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="min-h-[100px] resize-none glass-card"
                />
                <Button 
                  onClick={handleAddSingleKeyword}
                  variant="pinterest"
                  disabled={!newKeyword.trim()}
                  className="w-full shadow-premium"
                >
                  Add Keywords
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="glass-button">
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Add Keywords</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Paste your keywords here, one per line:&#10;vegan dinner ideas&#10;plant-based meals&#10;vegan desserts&#10;healthy vegan recipes"
                        value={bulkKeywords}
                        onChange={(e) => setBulkKeywords(e.target.value)}
                        className="min-h-[200px] resize-none"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleBulkAdd}
                          variant="pinterest"
                          className="flex-1"
                          disabled={!bulkKeywords.trim()}
                        >
                          Add Keywords
                        </Button>
                        <Button 
                          onClick={() => setIsBulkDialogOpen(false)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <KeywordTemplates onAddKeywords={handleAddFromTemplate} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords List */}
        <Card className="scroll-indicator">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Active Keywords
                {selectedKeywords.length > 0 && (
                  <Badge variant="default" className="bg-pinterest text-white">
                    {selectedKeywords.length} selected
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {displayedKeywords.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isDragMode}
                      onCheckedChange={setIsDragMode}
                      id="drag-mode"
                    />
                    <Label htmlFor="drag-mode" className="text-sm">
                      Reorder
                    </Label>
                  </div>
                )}
                {displayedKeywords.length > 0 && (
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectedKeywords.length === displayedKeywords.length ? handleDeselectAll : handleSelectAll}
                      className="gap-1"
                    >
                      {selectedKeywords.length === displayedKeywords.length ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <CheckSquare className="h-3 w-3" />
                      )}
                      {selectedKeywords.length === displayedKeywords.length ? 'Deselect' : 'Select'} All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyAllKeywords}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy All
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedKeywords.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayedKeywords.map(kw => kw.text)}
                  strategy={verticalListSortingStrategy}
                  disabled={!isDragMode}
                >
                  <div className="space-y-2">
                    {displayedKeywords.map((keyword, index) => (
                      <KeywordItem
                        key={keyword.text}
                        id={keyword.text}
                        keyword={keyword.text}
                        index={index}
                        isSelected={selectedKeywords.includes(keyword.text)}
                        isDone={keyword.isDone}
                        onEdit={handleEditKeyword}
                        onDelete={(kw) => onRemoveKeyword(selectedTarget.id, kw)}
                        onToggleSelect={handleToggleSelect}
                        onToggleDone={(kw) => onToggleRelevantKeywordDone?.(selectedTarget.id, kw)}
                        isDragMode={isDragMode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-accent/20 rounded-full blur-lg"></div>
                  <div className="relative bg-muted/30 p-4 rounded-full w-fit mx-auto">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h4 className="font-medium mb-2">
                  No Active Keywords
                </h4>
                <p className="text-muted-foreground text-sm mb-4">
                  All keywords have been completed! Check the archive or add new ones.
                </p>
                {!selectedTarget.isDone && (
                  <KeywordTemplates onAddKeywords={handleAddFromTemplate} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Generation Section */}
        {selectedTarget && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {/* SEO Article Prompt Generator */}
            <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-primary">
                  SEO Article Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate a comprehensive SEO article prompt with your target keyword and relevant keywords.
              </p>
              <Button
                onClick={handleGeneratePrompt}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-glow transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Article Prompt
              </Button>
            </div>

            {/* Pinterest Prompt Generator */}
            <div className="p-6 bg-gradient-to-br from-pinterest/5 to-pinterest-red-dark/5 border border-pinterest/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-pinterest/10">
                  <Target className="h-5 w-5 text-pinterest" />
                </div>
                <h3 className="text-lg font-semibold text-pinterest">
                  Pinterest Pin Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate Pinterest titles & descriptions with hashtags using your keywords.
              </p>
              <Button
                onClick={handleGeneratePinterestPrompt}
                className="w-full bg-gradient-to-r from-pinterest to-pinterest-red-dark hover:from-pinterest/90 hover:to-pinterest-red-dark/90 text-white shadow-glow transition-all duration-300"
              >
                <Target className="h-4 w-4 mr-2" />
                Generate Pinterest Prompt
              </Button>
            </div>

            {/* Image Generation Prompt */}
            <div className="p-6 bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-orange-500">
                  Image Generation Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate Pinterest pin design prompts with random hooks and CTAs for image creation.
              </p>
              <Button
                onClick={handleGenerateImagePrompt}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-500/90 hover:to-amber-500/90 text-white shadow-glow transition-all duration-300 min-h-[2.5rem] h-auto py-2 px-3"
              >
                <Lightbulb className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="break-words text-center leading-tight">Generate Image Prompt</span>
              </Button>
            </div>

            {/* Pin Power Pin Prompt */}
            <div className="p-6 bg-gradient-to-br from-purple-500/5 to-violet-500/5 border border-purple-500/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-purple-500">
                  Pin Power Pin Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate targeted headline variations for different audiences using your recipe keywords.
              </p>
              <Button
                onClick={handleGeneratePinPowerPrompt}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-500/90 hover:to-violet-500/90 text-white shadow-glow transition-all duration-300 min-h-[2.5rem] h-auto py-2 px-3"
              >
                <Zap className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="break-words text-center leading-tight">Generate Pin Power Prompt</span>
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Operations Floating Panel */}
        <BulkOperations
          selectedKeywords={selectedKeywords}
          totalKeywords={displayedKeywords.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={handleDeleteSelected}
          onCopySelected={handleCopySelected}
          onExportSelected={handleExportSelected}
        />
      </div>
    </div>
  );
};