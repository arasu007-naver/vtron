'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  RefreshCw,
  Sparkles,
  Settings,
  Zap,
  UserRound,
  Shirt,
  Lightbulb,
  Upload,
  Search,
  Check,
  Tag,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Sparkle,
  Watch,
  Glasses,
  Footprints,
  Plus
} from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage, useReactCompareSliderRef } from 'react-compare-slider';
import Banner from '@/components/tryon/Banner';
import TipsModal from '@/components/tryon/TipsModal';
import ApiKeyModal from '@/components/tryon/ApiKeyModal';
import Footer from '@/components/tryon/Footer';
import Button from '@/components/tryon/ui/button';
import Checkbox from '@/components/tryon/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/tryon/ui/card';
import FileInput from '@/components/tryon/ui/file-input';
import RadioGroup from '@/components/tryon/ui/radio-group';
import Slider from '@/components/tryon/ui/slider';
import { Dropdown } from '@/components/tryon/ui/dropdown';
import { cn } from '@/lib/utils';
import { useIsClient } from '@/lib/use-is-client';
import { authFetch } from '@/lib/auth-client';
import pica from 'pica';

// Map display names to API values
const CATEGORY_API_MAPPING: { [key: string]: string } = {
  "Auto": "auto",
  "Top": "tops",
  "Bottom": "bottoms",
  "Full-body": "one-pieces"
};

// Sample images for examples
const modelExamples = [
  '/models/model-example.png',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80'
];

const topExamples = [
  { name: 'Classic Poplin Shirt', url: '/garments/man-shirt.png', category: 'Top' },
  { name: 'Studio Knit Sweater', url: '/garments/garment-example.jpg', category: 'Top' },
  { name: 'Minimal Relaxed Tee', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80', category: 'Top' },
  { name: 'Denim Overshirt', url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80', category: 'Top' },
];

const bottomExamples = [
  { name: 'Raw Denim Jeans', url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80', category: 'Bottom' },
  { name: 'Tailored Wool Trousers', url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80', category: 'Bottom' },
  { name: 'Pleated Midi Skirt', url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&auto=format&fit=crop&q=80', category: 'Bottom' },
  { name: 'Wide Fit Cargo Pants', url: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500&auto=format&fit=crop&q=80', category: 'Bottom' },
];

const accessorySlots = [
  { id: 'outer', name: '아웃터', icon: Layers },
  { id: 'shoes', name: '신발', icon: Footprints },
  { id: 'bag', name: '가방', icon: ShoppingBag },
  { id: 'watch', name: '시계', icon: Watch },
  { id: 'glasses', name: '안경', icon: Glasses },
  { id: 'hat', name: '모자', icon: Tag },
];

const accessoryExamples = [
  { slot: 'outer', name: 'Tailored Blazer', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=80' },
  { slot: 'shoes', name: 'Leather Loafers', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80' },
  { slot: 'bag', name: 'Structured Tote Bag', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80' },
  { slot: 'watch', name: 'Minimalist Chronograph', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80' },
  { slot: 'glasses', name: 'Acetate Frame Sunglasses', url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format&fit=crop&q=80' },
];

const brandDirectory = [
  {
    id: 'chanel',
    name: 'CHANEL',
    category: 'Luxury',
    origin: 'Paris',
    tag: 'Haute Couture',
    badgeColor: 'bg-stone-900 text-stone-100',
    description: 'Iconic luxury tweed jackets & timeless accessories',
    defaultTop: '/garments/garment-example.jpg',
    defaultBottom: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prada',
    name: 'PRADA',
    category: 'Luxury',
    origin: 'Milano',
    tag: 'Modern Avant-Garde',
    badgeColor: 'bg-black text-white',
    description: 'Re-nylon outerwear, conceptual tailoring & leather goods',
    defaultTop: '/garments/man-shirt.png',
    defaultBottom: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'miumiu',
    name: 'MIU MIU',
    category: 'Luxury',
    origin: 'Milano',
    tag: 'Chic Girlish',
    badgeColor: 'bg-rose-900 text-rose-100',
    description: 'Micro mini-skirts, cropped knits & ballet flats',
    defaultTop: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
    defaultBottom: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'acne',
    name: 'ACNE STUDIOS',
    category: 'Contemporary',
    origin: 'Stockholm',
    tag: 'Nordic Minimal',
    badgeColor: 'bg-pink-800 text-pink-100',
    description: 'Relaxed denim, oversized scarves & modern outerwear',
    defaultTop: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80',
    defaultBottom: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'jacquemus',
    name: 'JACQUEMUS',
    category: 'Contemporary',
    origin: 'Paris',
    tag: 'Mediterranean Glam',
    badgeColor: 'bg-amber-800 text-amber-100',
    description: 'Sensual linen shirts, Le Chiquito bags & knitwear',
    defaultTop: '/garments/man-shirt.png',
    defaultBottom: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'stussy',
    name: 'STÜSSY',
    category: 'Streetwear',
    origin: 'California',
    tag: 'Original Street',
    badgeColor: 'bg-zinc-800 text-zinc-100',
    description: 'Graphic tees, fleece jackets, hoodies & bucket hats',
    defaultTop: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
    defaultBottom: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'matinkim',
    name: 'MATIN KIM',
    category: 'K-Fashion',
    origin: 'Seoul',
    tag: 'Trendy Daily',
    badgeColor: 'bg-slate-800 text-slate-100',
    description: 'Signature metal logo wallets, crop knits & baggy denim',
    defaultTop: '/garments/garment-example.jpg',
    defaultBottom: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'adererror',
    name: 'ADER ERROR',
    category: 'K-Fashion',
    origin: 'Seoul',
    tag: 'Deconstructed',
    badgeColor: 'bg-blue-900 text-blue-100',
    description: 'Oversized silhouettes, blue label details & asymmetric tailoring',
    defaultTop: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80',
    defaultBottom: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'gentlemonster',
    name: 'GENTLE MONSTER',
    category: 'Eyewear',
    origin: 'Seoul',
    tag: 'Experimental',
    badgeColor: 'bg-neutral-900 text-neutral-100',
    description: 'Futuristic sunglasses, bold silhouettes & designer collabs',
    defaultTop: '/garments/man-shirt.png',
    defaultBottom: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
  },
];

const BRAND_CATEGORIES = ['All', 'Luxury', 'Contemporary', 'Streetwear', 'K-Fashion', 'Eyewear'];

const MAX_IMAGE_HEIGHT = 2000;
const JPEG_QUALITY = 0.95;

let picaInstance: ReturnType<typeof pica> | null = null;
const getPica = () => (picaInstance ??= pica({ features: ['js', 'wasm'] }));

export default function Home() {
  // Input states - Model
  const [modelImageFile, setModelImageFile] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);

  // Input states - 3-split Garments
  const [topImageFile, setTopImageFile] = useState<File | null>(null);
  const [topImagePreview, setTopImagePreview] = useState<string | null>(null);

  const [bottomImageFile, setBottomImageFile] = useState<File | null>(null);
  const [bottomImagePreview, setBottomImagePreview] = useState<string | null>(null);

  const [selectedAccessorySlot, setSelectedAccessorySlot] = useState<string>('outer');
  const [accessoryImageFile, setAccessoryImageFile] = useState<File | null>(null);
  const [accessoryImagePreview, setAccessoryImagePreview] = useState<string | null>(null);

  // Active garment selection for Try-On engine
  const [activeGarmentType, setActiveGarmentType] = useState<'top' | 'bottom' | 'accessory'>('top');

  // Brand directory state
  const [selectedBrandCategory, setSelectedBrandCategory] = useState<string>('All');
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // API parameter states
  const [segmentationFree, setSegmentationFree] = useState(true);
  const [garmentPhotoType, setGarmentPhotoType] = useState('Auto');
  const [category, setCategory] = useState('Top');
  const [mode, setMode] = useState('Balanced');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [numSamples, setNumSamples] = useState<number>(1);
  const [modelVersion, setModelVersion] = useState('tryon-v1.6');
  const [comparison, setComparison] = useState(false);
  const [comparisonModel1, setComparisonModel1] = useState('tryon-v1.5');
  const [comparisonModel2, setComparisonModel2] = useState('tryon-v1.6');

  // Output states
  const [resultGallery, setResultGallery] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Advanced settings toggle & Tips modal state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);

  // Example carousel states
  const [modelExampleIndex, setModelExampleIndex] = useState(0);

  // Results modal & Comparison state
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'right' | 'left'>('right');
  const compareSliderRef = useReactCompareSliderRef();

  // API key modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);

  const isClient = useIsClient();
  const apiKey = savedApiKey ?? (isClient ? localStorage.getItem('fashn_api_key') ?? '' : '');

  // Filtered brands
  const filteredBrands = useMemo(() => {
    return brandDirectory.filter((brand) => {
      const matchCat = selectedBrandCategory === 'All' || brand.category === selectedBrandCategory;
      const matchQuery =
        brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase()) ||
        brand.tag.toLowerCase().includes(brandSearchQuery.toLowerCase()) ||
        brand.description.toLowerCase().includes(brandSearchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedBrandCategory, brandSearchQuery]);

  // Determine current active garment for tryon
  const currentGarmentFile = useMemo(() => {
    if (activeGarmentType === 'top') return topImageFile;
    if (activeGarmentType === 'bottom') return bottomImageFile;
    return accessoryImageFile;
  }, [activeGarmentType, topImageFile, bottomImageFile, accessoryImageFile]);

  // Navigation handlers
  const navigateResult = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentResultIndex((prevIndex) => {
        if (direction === 'prev' && prevIndex > 0) return prevIndex - 1;
        if (direction === 'next' && prevIndex < resultGallery.length - 1) return prevIndex + 1;
        return prevIndex;
      });
    },
    [resultGallery.length]
  );

  useEffect(() => {
    if (!isResultsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateResult('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateResult('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsResultsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isResultsModalOpen, navigateResult]);

  const handleSaveApiKey = (newApiKey: string) => {
    localStorage.setItem('fashn_api_key', newApiKey);
    setSavedApiKey(newApiKey);
    setIsApiKeyModalOpen(false);
  };

  // Automated comparison slider animation
  useEffect(() => {
    let animationActive = true;
    if (isAnimating && compareSliderRef.current) {
      const animateSlider = async () => {
        let step = 0;
        while (animationActive && isAnimating) {
          const positions = [85, 25, 50];
          const directions: ('right' | 'left')[] = ['right', 'left', 'right'];
          const currentPos = positions[step % positions.length];
          const currentDir = directions[step % directions.length];
          if (compareSliderRef.current && animationActive) {
            compareSliderRef.current.setPosition(currentPos);
            setSliderPosition(currentPos);
            setAnimationDirection(currentDir);
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
          step++;
        }
      };
      animateSlider();
    }
    return () => {
      animationActive = false;
    };
  }, [isAnimating, compareSliderRef]);

  const handleModelSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && modelExampleIndex > 0) {
      setModelExampleIndex(modelExampleIndex - 1);
    } else if (direction === 'right' && modelExampleIndex < modelExamples.length - 1) {
      setModelExampleIndex(modelExampleIndex + 1);
    }
  };

  const handleImageChange = (
    e: ChangeEvent<HTMLInputElement>,
    setImageFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    } else {
      setImageFile(null);
      setPreview(null);
    }
  };

  const loadExampleImage = async (
    imageUrl: string,
    setImageFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void
  ) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    } catch (err) {
      console.error('Failed to load example image:', err);
      setError('Failed to load example image.');
    }
  };

  const applyBrandPreset = (brand: (typeof brandDirectory)[0]) => {
    setSelectedBrandId(brand.id);
    if (brand.defaultTop) {
      loadExampleImage(brand.defaultTop, setTopImageFile, setTopImagePreview);
    }
    if (brand.defaultBottom) {
      loadExampleImage(brand.defaultBottom, setBottomImageFile, setBottomImagePreview);
    }
  };

  const loadRandomLook = () => {
    const randomModel = modelExamples[Math.floor(Math.random() * modelExamples.length)];
    const randomTop = topExamples[Math.floor(Math.random() * topExamples.length)];
    const randomBottom = bottomExamples[Math.floor(Math.random() * bottomExamples.length)];

    loadExampleImage(randomModel, setModelImageFile, setModelImagePreview);
    loadExampleImage(randomTop.url, setTopImageFile, setTopImagePreview);
    loadExampleImage(randomBottom.url, setBottomImageFile, setBottomImagePreview);
  };

  const handleReset = () => {
    setModelImageFile(null);
    setModelImagePreview(null);
    setTopImageFile(null);
    setTopImagePreview(null);
    setBottomImageFile(null);
    setBottomImagePreview(null);
    setAccessoryImageFile(null);
    setAccessoryImagePreview(null);
    setSelectedBrandId(null);
    setResultGallery([]);
    setError(null);
    setSegmentationFree(true);
    setGarmentPhotoType('Auto');
    setCategory('Top');
    setMode('Balanced');
    setSeed(Math.floor(Math.random() * 1000000));
    setNumSamples(1);
    setModelVersion('tryon-v1.6');
    setComparison(false);
    setIsComparisonMode(false);
    setSelectedResults([]);
    setIsComparisonModalOpen(false);
  };

  const resizeImagePica = async (file: File, maxDimension = MAX_IMAGE_HEIGHT): Promise<File> => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = objectUrl;
    await img.decode();
    const { width, height } = img;

    if (width <= maxDimension && height <= maxDimension) {
      URL.revokeObjectURL(objectUrl);
      return file;
    }

    const aspect = width / height;
    let newWidth, newHeight;
    if (width > height) {
      newWidth = maxDimension;
      newHeight = Math.round(maxDimension / aspect);
    } else {
      newHeight = maxDimension;
      newWidth = Math.round(maxDimension * aspect);
    }

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const ctx = sourceCanvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = newWidth;
    targetCanvas.height = newHeight;

    const resizer = getPica();
    await resizer.resize(sourceCanvas, targetCanvas);

    const outputBlob = await resizer.toBlob(targetCanvas, file.type || 'image/png', JPEG_QUALITY);
    const resizedFile = new File([outputBlob], file.name, { type: outputBlob.type });
    URL.revokeObjectURL(objectUrl);
    return resizedFile;
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const targetGarment = currentGarmentFile || topImageFile || bottomImageFile || accessoryImageFile;

    if (!modelImageFile) {
      setError('모델 이미지를 선택하거나 업로드해 주세요.');
      return;
    }
    if (!targetGarment) {
      setError('착장할 의류(상의, 하의, 악세사리 중 하나)를 선택해 주세요.');
      return;
    }

    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let modelImageBase64, garmentImageBase64;
      try {
        const resizedModelFile = await resizeImagePica(modelImageFile);
        const resizedGarmentFile = await resizeImagePica(targetGarment);
        modelImageBase64 = await fileToBase64(resizedModelFile);
        garmentImageBase64 = await fileToBase64(resizedGarmentFile);
      } catch (preprocessError) {
        console.warn('Image preprocessing failed, falling back:', preprocessError);
        modelImageBase64 = await fileToBase64(modelImageFile);
        garmentImageBase64 = await fileToBase64(targetGarment);
      }

      const activeCategoryMapping =
        activeGarmentType === 'top'
          ? 'tops'
          : activeGarmentType === 'bottom'
            ? 'bottoms'
            : CATEGORY_API_MAPPING[category] || 'auto';

      const basePayload = {
        model_image: modelImageBase64,
        garment_image: garmentImageBase64,
        garment_photo_type: garmentPhotoType.toLowerCase(),
        category: activeCategoryMapping,
        mode: mode.toLowerCase(),
        segmentation_free: segmentationFree,
        seed: seed,
        num_samples: numSamples,
        api_key: apiKey,
      };

      if (comparison) {
        const [model1Response, model2Response] = await Promise.all([
          authFetch('/api/tryon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...basePayload, model_name: comparisonModel1 }),
          }),
          authFetch('/api/tryon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...basePayload, model_name: comparisonModel2 }),
          }),
        ]);

        const [model1Data, model2Data] = await Promise.all([
          model1Response.json(),
          model2Response.json(),
        ]);

        if (!model1Response.ok) {
          if (model1Data.requiresApiKey) setIsApiKeyModalOpen(true);
          throw new Error(`${comparisonModel1} API failed: ${model1Data.error || model1Response.statusText}`);
        }
        if (!model2Response.ok) {
          throw new Error(`${comparisonModel2} API failed: ${model2Data.error || model2Response.statusText}`);
        }

        const model1Results = model1Data.output || [];
        const model2Results = model2Data.output || [];
        setResultGallery([...model1Results, ...model2Results]);
      } else {
        const payload = { ...basePayload, model_name: modelVersion };
        const response = await authFetch('/api/tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
          if (data.requiresApiKey) setIsApiKeyModalOpen(true);
          throw new Error(data.error || `API request failed with status ${response.status}`);
        }

        setResultGallery(data.output || []);
      }
    } catch (err: unknown) {
      console.error('Try-on error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full min-h-full bg-gradient-to-b from-[#f8f9fa] to-[#edeef0] dark:from-gray-950 dark:to-gray-900 p-2.5 sm:p-4 lg:p-5 flex flex-col"
      style={{ fontSize: '70%' }}
    >
      <div className="w-full space-y-3.5 flex-1 flex flex-col">

        {/* ============================================================================== */}
        {/* BODY TOP: Global Action Toolbar (View Tips & Show Advanced Settings Placement) */}
        {/* ============================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 px-4 bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-2"
        >
          {/* Left Action Buttons */}
          <div className="flex items-center flex-wrap gap-1.5">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-200 dark:border-gray-700">
              <Sparkle className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-[10.5px]">
                STMX Studio
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                v1.6 Ready
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadRandomLook}
              className="flex items-center gap-1 text-[9px] h-7 px-2.5"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>랜덤 착장 프리셋</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApiKeyModalOpen(true)}
              className="flex items-center gap-1 text-[9px] h-7 px-2.5"
            >
              <Zap className="w-3 h-3 text-blue-600" />
              <span>{apiKey ? 'API Key 연동됨' : 'API Key 설정'}</span>
            </Button>
          </div>

          {/* Right Action Buttons: [View Tips] on the LEFT of [Show Advanced Settings] */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsTipsModalOpen(true)}
              className="flex items-center gap-1 text-[9px] font-medium h-7 px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300/60 dark:border-gray-700"
            >
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>View Tips</span>
            </Button>

            <Button
              type="button"
              variant={showAdvancedSettings ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center gap-1 text-[9px] font-medium h-7 px-2.5 transition-all"
            >
              <Settings className="w-3 h-3" />
              <span>{showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings</span>
            </Button>
          </div>

          <TipsModal isOpen={isTipsModalOpen} onClose={() => setIsTipsModalOpen(false)} />
        </motion.div>

        {/* ============================================================================== */}
        {/* BODY: 3-Column Layout (좌우 3단)                                              */}
        {/* Column 1: Model Image + Bottom Controls                                       */}
        {/* Column 2: 3-Split Garment Section (상의 / 하의 / 패션 악세사리)                 */}
        {/* Column 3: Brand Directory (브랜드 목록)                                       */}
        {/* ============================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ---------------------------------------------------------------------------- */}
          {/* COLUMN 1 (Left 4 cols): Model Image & Controls                                */}
          {/* ---------------------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <Card className="flex flex-col h-full shadow-2xs border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900">
              <CardHeader className="pb-2.5 pt-3 px-3.5 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <UserRound className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    <span>모델 이미지 (Model)</span>
                  </div>
                  {modelImagePreview && (
                    <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      선택 완료
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 p-3 flex-1 flex flex-col justify-between">
                {/* 1. 상단 한줄 버튼 그룹 영역 */}
                <div className="flex items-center justify-between gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                  <label className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded shadow-2xs text-[8.5px] font-medium text-gray-800 dark:text-gray-100 cursor-pointer transition-colors text-center truncate">
                    <Upload className="w-3 h-3 text-gray-600" />
                    <span>사진 업로드</span>
                    <input
                      type="file"
                      onChange={(e) => handleImageChange(e, setModelImageFile, setModelImagePreview)}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (modelExampleIndex + 1) % modelExamples.length;
                      setModelExampleIndex(nextIdx);
                      loadExampleImage(modelExamples[nextIdx], setModelImageFile, setModelImagePreview);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded shadow-2xs text-[8.5px] font-medium text-gray-800 dark:text-gray-100 cursor-pointer transition-colors text-center truncate"
                  >
                    <RefreshCw className="w-3 h-3 text-gray-600" />
                    <span>샘플 모델 ({modelExampleIndex + 1}/{modelExamples.length})</span>
                  </button>

                  {modelImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setModelImageFile(null);
                        setModelImagePreview(null);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors cursor-pointer"
                      title="모델 이미지 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 2. 중간 모델 미리보기 영역 */}
                <div className="my-auto">
                  <AnimatePresence mode="wait">
                    {modelImagePreview ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative mx-auto"
                      >
                        <div className="aspect-[3/4] max-w-[280px] mx-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xs flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                          <Image
                            src={modelImagePreview}
                            alt="Model Preview"
                            className="max-w-full max-h-full object-contain p-1"
                            width={300}
                            height={400}
                            unoptimized
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="aspect-[3/4] max-w-[280px] mx-auto border-2 border-dashed border-gray-300/80 dark:border-gray-700 rounded-lg relative overflow-hidden bg-gray-50/70 dark:bg-gray-800/50 group"
                      >
                        <div className="w-full h-full relative cursor-pointer">
                          <Image
                            src={modelExamples[modelExampleIndex]}
                            alt={`Model Example ${modelExampleIndex + 1}`}
                            width={280}
                            height={350}
                            className="w-full h-full object-contain pointer-events-none opacity-85 group-hover:scale-102 transition-transform duration-200 p-1.5"
                          />
                          <div
                            onClick={() =>
                              loadExampleImage(modelExamples[modelExampleIndex], setModelImageFile, setModelImagePreview)
                            }
                            className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors flex flex-col items-center justify-center p-2 text-center"
                          >
                            <div className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 px-2.5 py-1 rounded-full text-[8.5px] font-semibold shadow-md backdrop-blur-sm mb-1.5">
                              클릭하여 이 모델 선택
                            </div>
                            <span className="text-[8px] text-white/90">
                              또는 상단 [사진 업로드] 클릭
                            </span>
                          </div>

                          {/* Navigation controls */}
                          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-2.5 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleModelSwipe('left');
                              }}
                              disabled={modelExampleIndex === 0}
                              className="w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center disabled:opacity-30 text-white cursor-pointer text-[10px]"
                            >
                              ‹
                            </button>
                            <div className="flex gap-1">
                              {modelExamples.map((_, idx) => (
                                <span
                                  key={idx}
                                  className={`w-1 h-1 rounded-full ${
                                    idx === modelExampleIndex ? 'bg-white scale-125' : 'bg-white/40'
                                  }`}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleModelSwipe('right');
                              }}
                              disabled={modelExampleIndex === modelExamples.length - 1}
                              className="w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center disabled:opacity-30 text-white cursor-pointer text-[10px]"
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. 하단 한줄 Action button group */}
                <div className="flex gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isLoading || !modelImageFile}
                    loading={isLoading}
                    className="flex-1 h-8.5 text-[10.5px] font-semibold bg-gray-900 hover:bg-black text-white shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" />
                    {isLoading ? '가상 피팅 생성 중...' : 'Run Try-On (가상 피팅)'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="h-8.5 px-2.5 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    title="전체 초기화"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>

                {/* 4. Controls 영역 (맨왼쪽 하단 가로 컴팩트 배치) */}
                <div className="p-2.5 bg-gray-50/90 dark:bg-gray-850/80 rounded-lg border border-gray-200/70 dark:border-gray-750 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-semibold text-gray-800 dark:text-gray-200">
                    <div className="flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3 text-gray-500" />
                      <span>피팅 컨트롤 (Controls)</span>
                    </div>
                    <span className="text-[8px] font-normal text-gray-500">
                      모드: {mode}
                    </span>
                  </div>

                  {/* Horizontal Run Mode Selector */}
                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    {['Performance', 'Balanced', 'Quality'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={cn(
                          'py-0.5 text-[8.5px] font-medium rounded transition-all text-center cursor-pointer',
                          mode === m
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-2xs'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                        )}
                      >
                        {m === 'Performance' ? '⚡ 고속' : m === 'Balanced' ? '⚖️ 균형' : '✨ 최고화질'}
                      </button>
                    ))}
                  </div>

                  {/* Horizontal Switches & Status */}
                  <div className="flex items-center justify-between gap-2 text-[8.5px]">
                    <Checkbox
                      checked={segmentationFree}
                      onChange={(e) => setSegmentationFree(e.target.checked)}
                      label="Auto Segmentation"
                      description="인물/의류 자동 영역 분리"
                    />

                    <div className="text-[8px] text-gray-500 flex items-center gap-1 font-mono">
                      <span>Seed:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{seed}</span>
                      <button
                        type="button"
                        onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                        className="hover:scale-110 transition-transform cursor-pointer"
                        title="새 Seed 발급"
                      >
                        🎲
                      </button>
                    </div>
                  </div>

                  {/* Expandable Advanced Controls when toggled from top */}
                  <AnimatePresence>
                    {showAdvancedSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-1.5 border-t border-gray-200 dark:border-gray-700 space-y-2 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[8px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                              Model Engine
                            </label>
                            <select
                              value={modelVersion}
                              onChange={(e) => setModelVersion(e.target.value)}
                              className="w-full px-1.5 py-0.5 text-[8.5px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                            >
                              <option value="tryon-v1.6">v1.6 (Latest)</option>
                              <option value="tryon-v1.5">v1.5 (Stable)</option>
                              <option value="tryon-staging">Staging (Beta)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[8px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                              생성 매수 (Samples)
                            </label>
                            <select
                              value={numSamples}
                              onChange={(e) => setNumSamples(Number(e.target.value))}
                              className="w-full px-1.5 py-0.5 text-[8.5px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                            >
                              <option value={1}>1장</option>
                              <option value={2}>2장</option>
                              <option value={4}>4장 (비교용)</option>
                            </select>
                          </div>
                        </div>

                        <Checkbox
                          checked={comparison}
                          onChange={(e) => setComparison(e.target.checked)}
                          label="⚖️ 듀얼 모델 비교 실행"
                          description="v1.5와 v1.6 모델 결과를 나란히 비교합니다"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[8.5px] rounded border border-red-200 dark:border-red-900/60 flex items-start gap-1">
                      <X className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ---------------------------------------------------------------------------- */}
          {/* COLUMN 2 (Middle 5 cols): 3-Split Garments & Accessories (상의 / 하의 / 악세사리) */}
          {/* ---------------------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <Card className="flex flex-col h-full shadow-2xs border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900">
              <CardHeader className="pb-2.5 pt-3 px-3.5 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <Shirt className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span>의류 및 패션 악세사리 선택 (3-Split)</span>
                </CardTitle>
                <span className="text-[8.5px] text-gray-500 font-medium">
                  피팅 타겟: <span className="font-semibold text-gray-900 dark:text-gray-100">{activeGarmentType === 'top' ? '상의' : activeGarmentType === 'bottom' ? '하의' : '악세사리'}</span>
                </span>
              </CardHeader>

              <CardContent className="space-y-3 p-3 flex-1 flex flex-col justify-between">
                {/* 1. 상의 (Top) 영역 */}
                <div
                  className={cn(
                    'p-2.5 rounded-lg border transition-all',
                    activeGarmentType === 'top'
                      ? 'border-gray-900/80 dark:border-gray-300 bg-gray-50/70 dark:bg-gray-850/60 shadow-2xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setActiveGarmentType('top')}
                      className="flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-gray-900 text-white text-[8px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <span className="font-semibold text-[10px] text-gray-900 dark:text-gray-100">
                        상의 (Tops)
                      </span>
                      {topImagePreview && (
                        <span className="text-[7px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                          등록됨
                        </span>
                      )}
                    </button>

                    <label className="text-[8px] font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <Upload className="w-2.5 h-2.5" />
                      <span>상의 업로드</span>
                      <input
                        type="file"
                        onChange={(e) => {
                          handleImageChange(e, setTopImageFile, setTopImagePreview);
                          setActiveGarmentType('top');
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Thumbnail / Upload Box */}
                    <div className="w-14 h-17 border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 flex items-center justify-center relative group">
                      {topImagePreview ? (
                        <>
                          <Image
                            src={topImagePreview}
                            alt="Top Preview"
                            width={56}
                            height={68}
                            className="w-full h-full object-contain p-0.5"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setTopImageFile(null);
                              setTopImagePreview(null);
                            }}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <Shirt className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>

                    {/* Quick Example Selector */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-[8px] font-medium text-gray-500 mb-1">
                        추천 상의 샘플:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {topExamples.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              loadExampleImage(item.url, setTopImageFile, setTopImagePreview);
                              setActiveGarmentType('top');
                            }}
                            className="border border-gray-200 dark:border-gray-700 hover:border-gray-900 rounded p-0.5 bg-white dark:bg-gray-800 flex flex-col items-center gap-0.5 cursor-pointer group transition-all"
                          >
                            <div className="w-5.5 h-5.5 relative">
                              <Image
                                src={item.url}
                                alt={item.name}
                                width={22}
                                height={22}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[6.5px] text-gray-600 dark:text-gray-400 truncate w-full text-center">
                              {item.name.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 하의 (Bottom) 영역 */}
                <div
                  className={cn(
                    'p-2.5 rounded-lg border transition-all',
                    activeGarmentType === 'bottom'
                      ? 'border-gray-900/80 dark:border-gray-300 bg-gray-50/70 dark:bg-gray-850/60 shadow-2xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setActiveGarmentType('bottom')}
                      className="flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-gray-900 text-white text-[8px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <span className="font-semibold text-[10px] text-gray-900 dark:text-gray-100">
                        하의 (Bottoms)
                      </span>
                      {bottomImagePreview && (
                        <span className="text-[7px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                          등록됨
                        </span>
                      )}
                    </button>

                    <label className="text-[8px] font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <Upload className="w-2.5 h-2.5" />
                      <span>하의 업로드</span>
                      <input
                        type="file"
                        onChange={(e) => {
                          handleImageChange(e, setBottomImageFile, setBottomImagePreview);
                          setActiveGarmentType('bottom');
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Thumbnail / Upload Box */}
                    <div className="w-14 h-17 border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 flex items-center justify-center relative group">
                      {bottomImagePreview ? (
                        <>
                          <Image
                            src={bottomImagePreview}
                            alt="Bottom Preview"
                            width={56}
                            height={68}
                            className="w-full h-full object-contain p-0.5"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setBottomImageFile(null);
                              setBottomImagePreview(null);
                            }}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <Layers className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>

                    {/* Quick Example Selector */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-[8px] font-medium text-gray-500 mb-1">
                        추천 하의 샘플:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {bottomExamples.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              loadExampleImage(item.url, setBottomImageFile, setBottomImagePreview);
                              setActiveGarmentType('bottom');
                            }}
                            className="border border-gray-200 dark:border-gray-700 hover:border-gray-900 rounded p-0.5 bg-white dark:bg-gray-800 flex flex-col items-center gap-0.5 cursor-pointer group transition-all"
                          >
                            <div className="w-5.5 h-5.5 relative">
                              <Image
                                src={item.url}
                                alt={item.name}
                                width={22}
                                height={22}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[6.5px] text-gray-600 dark:text-gray-400 truncate w-full text-center">
                              {item.name.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 패션 악세사리 (Accessories & Outerwear) 영역 */}
                <div
                  className={cn(
                    'p-2.5 rounded-lg border transition-all',
                    activeGarmentType === 'accessory'
                      ? 'border-gray-900/80 dark:border-gray-300 bg-gray-50/70 dark:bg-gray-850/60 shadow-2xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setActiveGarmentType('accessory')}
                      className="flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-gray-900 text-white text-[8px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <span className="font-semibold text-[10px] text-gray-900 dark:text-gray-100">
                        패션 악세사리 (Accessories)
                      </span>
                      {accessoryImagePreview && (
                        <span className="text-[7px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                          등록됨
                        </span>
                      )}
                    </button>

                    <label className="text-[8px] font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <Upload className="w-2.5 h-2.5" />
                      <span>악세사리 업로드</span>
                      <input
                        type="file"
                        onChange={(e) => {
                          handleImageChange(e, setAccessoryImageFile, setAccessoryImagePreview);
                          setActiveGarmentType('accessory');
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Accessory Category Chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {accessorySlots.map((slot) => {
                      const Icon = slot.icon;
                      const isSelected = selectedAccessorySlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccessorySlot(slot.id);
                            setActiveGarmentType('accessory');
                            const sample = accessoryExamples.find((ex) => ex.slot === slot.id);
                            if (sample) {
                              loadExampleImage(sample.url, setAccessoryImageFile, setAccessoryImagePreview);
                            }
                          }}
                          className={cn(
                            'px-1.5 py-0.5 rounded-full text-[8px] font-medium inline-flex items-center gap-0.5 transition-all cursor-pointer border',
                            isSelected
                              ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                          )}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          <span>{slot.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Thumbnail / Upload Box */}
                    <div className="w-14 h-17 border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 flex items-center justify-center relative group">
                      {accessoryImagePreview ? (
                        <>
                          <Image
                            src={accessoryImagePreview}
                            alt="Accessory Preview"
                            width={56}
                            height={68}
                            className="w-full h-full object-contain p-0.5"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setAccessoryImageFile(null);
                              setAccessoryImagePreview(null);
                            }}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>

                    {/* Quick Example Selector */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-[8px] font-medium text-gray-500 mb-1">
                        추천 악세사리 샘플:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {accessoryExamples.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              loadExampleImage(item.url, setAccessoryImageFile, setAccessoryImagePreview);
                              setSelectedAccessorySlot(item.slot);
                              setActiveGarmentType('accessory');
                            }}
                            className="border border-gray-200 dark:border-gray-700 hover:border-gray-900 rounded p-0.5 bg-white dark:bg-gray-800 flex flex-col items-center gap-0.5 cursor-pointer group transition-all"
                          >
                            <div className="w-5.5 h-5.5 relative">
                              <Image
                                src={item.url}
                                alt={item.name}
                                width={22}
                                height={22}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[6.5px] text-gray-600 dark:text-gray-400 truncate w-full text-center">
                              {item.name.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ---------------------------------------------------------------------------- */}
          {/* COLUMN 3 (Right 3 cols): Brand Directory (브랜드 목록)                       */}
          {/* ---------------------------------------------------------------------------- */}
          <div className="lg:col-span-3 flex flex-col gap-3.5">
            <Card className="flex flex-col h-full shadow-2xs border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900">
              <CardHeader className="pb-2.5 pt-3 px-3.5 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShoppingBag className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    <span>브랜드 목록 (Brands)</span>
                  </div>
                  <span className="text-[8px] font-medium text-gray-500">
                    {filteredBrands.length}개 브랜드
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                {/* Brand Search Bar */}
                <div className="relative">
                  <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="브랜드 검색 (Chanel, Prada...)"
                    value={brandSearchQuery}
                    onChange={(e) => setBrandSearchQuery(e.target.value)}
                    className="w-full pl-6.5 pr-2.5 py-1 text-[8.5px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  {brandSearchQuery && (
                    <button
                      onClick={() => setBrandSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 vt-scroll">
                  {BRAND_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedBrandCategory(cat)}
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[8px] font-medium whitespace-nowrap transition-all cursor-pointer',
                        selectedBrandCategory === cat
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Scrollable Brand List */}
                <div className="flex-1 overflow-y-auto max-h-[580px] space-y-1.5 pr-1 vt-scroll">
                  {filteredBrands.map((brand) => {
                    const isSelected = selectedBrandId === brand.id;
                    return (
                      <div
                        key={brand.id}
                        className={cn(
                          'p-2.5 rounded-lg border transition-all flex flex-col gap-1.5',
                          isSelected
                            ? 'border-gray-900 dark:border-gray-300 bg-gray-50/90 dark:bg-gray-800/90 shadow-2xs'
                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 hover:border-gray-300 dark:hover:border-gray-700'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-[family-name:var(--font-heading)] font-bold text-[10.5px] tracking-wide text-gray-900 dark:text-gray-100">
                              {brand.name}
                            </span>
                            <span className="text-[7px] text-gray-500 font-mono">
                              {brand.origin}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-[7px] font-semibold px-1.5 py-0.5 rounded-full',
                              brand.badgeColor
                            )}
                          >
                            {brand.category}
                          </span>
                        </div>

                        <p className="text-[8px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {brand.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-750">
                          <span className="text-[7px] text-gray-400 italic">
                            #{brand.tag}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyBrandPreset(brand)}
                            className="h-5 px-2 text-[8px] font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded"
                          >
                            <span>착장 세트 적용</span>
                            <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredBrands.length === 0 && (
                    <div className="py-6 text-center text-gray-400 text-[9px]">
                      검색 조건에 맞는 브랜드가 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================================================== */}
        {/* TRY-ON RESULTS SECTION                                                         */}
        {/* ============================================================================== */}
        <AnimatePresence mode="wait">
          {(isLoading || resultGallery.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs">
                <CardHeader className="py-2.5 px-3.5">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>가상 피팅 결과 (Try-On Results)</span>
                    </div>
                    {resultGallery.length > 1 && !isLoading && (
                      <div className="flex items-center gap-1.5">
                        {isComparisonMode && (
                          <span className="text-[9px] text-gray-600 dark:text-gray-400">
                            비교할 2장의 이미지를 선택하세요 ({selectedResults.length}/2)
                          </span>
                        )}
                        <Button
                          variant={isComparisonMode ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setIsComparisonMode(!isComparisonMode);
                            setSelectedResults([]);
                          }}
                          className="flex items-center gap-1 text-[9px] h-7 px-2"
                        >
                          {isComparisonMode ? (
                            <>
                              <X className="h-3 w-3" />
                              <span>취소</span>
                            </>
                          ) : (
                            <>
                              <span>⚖️ 비교 모드</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center space-y-3"
                      >
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full border-3 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 animate-spin" />
                          <Sparkles className="h-5 w-5 text-amber-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 text-[11px] font-medium animate-pulse">
                          FASHN AI 가상 피팅 이미지를 생성하고 있습니다...
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                      >
                        {resultGallery.map((url, index) => {
                          const isSelected = selectedResults.includes(index);
                          const canSelect = isComparisonMode && (selectedResults.length < 2 || isSelected);

                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                transition: { delay: index * 0.05, duration: 0.2 },
                              }}
                              className={cn(
                                'relative group cursor-pointer rounded-lg overflow-hidden',
                                isSelected && 'ring-2 ring-blue-500 ring-offset-2',
                                isComparisonMode && !canSelect && 'opacity-50 cursor-not-allowed'
                              )}
                              onClick={() => {
                                if (!isComparisonMode) {
                                  setCurrentResultIndex(index);
                                  setIsResultsModalOpen(true);
                                  return;
                                }
                                if (selectedResults.includes(index)) {
                                  setSelectedResults(selectedResults.filter((i) => i !== index));
                                } else if (selectedResults.length < 2) {
                                  const newSelection = [...selectedResults, index];
                                  setSelectedResults(newSelection);
                                  if (newSelection.length === 2) {
                                    setIsComparisonModalOpen(true);
                                  }
                                }
                              }}
                              tabIndex={0}
                              role="button"
                            >
                              <div className="aspect-[3/4] border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xs flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                                <Image
                                  src={url}
                                  alt={`Result ${index + 1}`}
                                  className="max-w-full max-h-full object-contain p-1.5"
                                  width={300}
                                  height={400}
                                  unoptimized
                                />
                              </div>

                              {isComparisonMode && (
                                <div className="absolute top-1.5 left-1.5 z-10">
                                  <div
                                    className={cn(
                                      'w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8.5px] font-bold',
                                      isSelected
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'bg-white/90 border-gray-400 text-black'
                                    )}
                                  >
                                    {isSelected ? selectedResults.indexOf(index) + 1 : ''}
                                  </div>
                                </div>
                              )}

                              {!isComparisonMode && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                  <div className="bg-white/95 text-gray-900 py-1 px-2.5 rounded-full text-[9px] font-semibold flex items-center gap-1 shadow-md">
                                    <Zap className="h-3 w-3 text-amber-500" />
                                    <span>크게 보기</span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-screen Results Modal */}
        <AnimatePresence>
          {isResultsModalOpen && resultGallery.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 w-screen h-screen bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => setIsResultsModalOpen(false)}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsResultsModalOpen(false)}
                  className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3.5 py-1.5 rounded-full text-[10px] backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <span>
                      {currentResultIndex + 1} of {resultGallery.length}
                    </span>
                    {resultGallery.length > 1 && (
                      <span className="text-[8.5px] opacity-75">• 키보드 ← → 방향키로 이동</span>
                    )}
                  </div>
                </div>

                {currentResultIndex > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateResult('prev');
                    }}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors cursor-pointer text-[14px]"
                  >
                    ‹
                  </button>
                )}

                {currentResultIndex < resultGallery.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateResult('next');
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors cursor-pointer text-[14px]"
                  >
                    ›
                  </button>
                )}

                <motion.div
                  key={currentResultIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="w-full h-full flex items-center justify-center p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={resultGallery[currentResultIndex]}
                    alt={`Result ${currentResultIndex + 1}`}
                    className="w-auto h-auto max-w-[min(600px,calc(100vw-2rem))] max-h-[min(800px,calc(100vh-2rem))] object-contain"
                    width={1200}
                    height={1600}
                    unoptimized
                  />
                </motion.div>

                <a
                  href={resultGallery[currentResultIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="absolute bottom-4 right-4 z-10 bg-white text-gray-900 font-semibold px-4 py-2 rounded-full text-[10px] flex items-center gap-1.5 backdrop-blur-sm transition-colors cursor-pointer shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>다운로드</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Modal */}
        <AnimatePresence>
          {isComparisonModalOpen && selectedResults.length === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 w-screen h-screen bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => {
                setIsComparisonModalOpen(false);
                setSelectedResults([]);
                setIsComparisonMode(false);
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsComparisonModalOpen(false);
                    setSelectedResults([]);
                    setIsComparisonMode(false);
                  }}
                  className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3.5 py-1.5 rounded-full text-[10px] backdrop-blur-sm">
                  <span>⚖️ 슬라이더로 두 피팅 결과 비교</span>
                </div>

                <div
                  className="relative w-full max-w-2xl aspect-[3/4] overflow-hidden rounded-lg border border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ReactCompareSlider
                    ref={compareSliderRef}
                    itemOne={
                      <ReactCompareSliderImage
                        src={resultGallery[selectedResults[0]]}
                        alt="Result 1"
                      />
                    }
                    itemTwo={
                      <ReactCompareSliderImage
                        src={resultGallery[selectedResults[1]]}
                        alt="Result 2"
                      />
                    }
                    position={sliderPosition}
                    onPositionChange={(pos) => setSliderPosition(pos)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Key Modal */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onSave={handleSaveApiKey}
        />
      </div>
    </div>
  );
}
