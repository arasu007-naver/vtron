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
  ShoppingBag,
  SlidersHorizontal,
  Layers,
  Sparkle,
  PersonStanding,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage, useReactCompareSliderRef } from 'react-compare-slider';
import TipsModal from '@/components/tryon/TipsModal';
import ApiKeyModal from '@/components/tryon/ApiKeyModal';
import ProductSearch from '@/components/tryon/ProductSearch';
import Button from '@/components/tryon/ui/button';
import Checkbox from '@/components/tryon/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/tryon/ui/card';
import { cn } from '@/lib/utils';
import { useIsClient } from '@/lib/use-is-client';
import { authFetch } from '@/lib/auth-client';
import type { CatalogProduct } from '@/lib/tryon/product-catalog';
import pica from 'pica';

/**
 * 가상 피팅 화면.
 *
 * 콘텐츠 영역을 통째로 쓰는 3단이다(`app/layout.tsx` 가 NavBar 아래로 내준 자리).
 * 페이지가 통으로 늘어나 바깥 스크롤이 생기지 않도록 **세로로 늘어나는 것은 각 단 안쪽뿐**이다.
 *
 *   왼쪽   모델 사진과 실행 · 컨트롤
 *   가운데  입힐 옷 세 자리와 피팅 결과
 *   오른쪽  착장 상품 찾기([[ProductSearch]])
 *
 * 옷은 **상의 · 하의 · 원피스 세 자리, 자리마다 사진 한 장**이다. 자리가 곧 FASHN 의 category
 * (`tops` · `bottoms` · `one-pieces`)라 예전처럼 분류를 따로 고를 것이 없다. 원피스는 상·하의를
 * 한 벌로 대신하는 자리이므로, 원피스를 피팅 대상으로 두면 상·하의는 그 판에 쓰이지 않는다.
 *
 * 옷 사진은 두 곳에서 온다.
 *  - 오른쪽에서 고른 **내재화된 카탈로그 상품** — 브랜드 · 카테고리 · 상품명으로 찾는다.
 *  - 직접 올린 사진 — 카탈로그에 없는 옷을 넣어 볼 때.
 * 카탈로그 상품은 목록용 축소본이 아니라 **원본**(`originalImageUrl`)을 내려받아 넣는다.
 */

/** 옷을 넣는 자리. 자리 하나에 사진 한 장이고, 그 자리가 FASHN 의 category 를 정한다. */
type GarmentSlot = 'top' | 'bottom' | 'onepiece';

interface GarmentSlotDef {
  id: GarmentSlot;
  name: string;
  /** FASHN `category` 값. */
  apiCategory: 'tops' | 'bottoms' | 'one-pieces';
  icon: typeof Shirt;
  hint: string;
}

const GARMENT_SLOTS: GarmentSlotDef[] = [
  { id: 'top', name: '상의', apiCategory: 'tops', icon: Shirt, hint: '티셔츠 · 셔츠 · 니트 · 아우터' },
  { id: 'bottom', name: '하의', apiCategory: 'bottoms', icon: Layers, hint: '바지 · 스커트 · 데님' },
  {
    id: 'onepiece',
    name: '원피스',
    apiCategory: 'one-pieces',
    icon: PersonStanding,
    hint: '상·하의를 한 벌로 대신합니다',
  },
];

/** 한 자리에 담긴 것 — 사진 한 장과, 카탈로그에서 왔다면 그 상품. */
interface GarmentPick {
  file: File | null;
  preview: string | null;
  /** 카탈로그에서 고른 것이면 그 상품. 직접 올린 사진이면 null. */
  product: Pick<CatalogProduct, 'id' | 'name' | 'brandName' | 'catalogUrl'> | null;
}

const EMPTY_PICK: GarmentPick = { file: null, preview: null, product: null };

const EMPTY_GARMENTS: Record<GarmentSlot, GarmentPick> = {
  top: EMPTY_PICK,
  bottom: EMPTY_PICK,
  onepiece: EMPTY_PICK,
};

/** 모델 사진 예시. 사람 사진은 상품 카탈로그에 없어 여기 남겨 둔다. */
const modelExamples = [
  '/models/model-example.png',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
];

const MAX_IMAGE_HEIGHT = 2000;
const JPEG_QUALITY = 0.95;

let picaInstance: ReturnType<typeof pica> | null = null;
const getPica = () => (picaInstance ??= pica({ features: ['js', 'wasm'] }));

export default function Home() {
  // Input states - Model
  const [modelImageFile, setModelImageFile] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);

  // Input states - 옷 세 자리
  const [garments, setGarments] = useState<Record<GarmentSlot, GarmentPick>>(EMPTY_GARMENTS);
  /** 피팅에 넣을 자리. 오른쪽에서 고른 상품도 이 자리에 담긴다. */
  const [activeSlot, setActiveSlot] = useState<GarmentSlot>('top');
  /** 상품 사진을 내려받는 중인 자리. */
  const [loadingSlot, setLoadingSlot] = useState<GarmentSlot | null>(null);

  // API parameter states
  const [segmentationFree, setSegmentationFree] = useState(true);
  const [garmentPhotoType] = useState('Auto');
  const [mode, setMode] = useState('Balanced');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [numSamples, setNumSamples] = useState<number>(1);
  const [modelVersion, setModelVersion] = useState('tryon-v1.6');
  const [comparison, setComparison] = useState(false);
  const [comparisonModel1] = useState('tryon-v1.5');
  const [comparisonModel2] = useState('tryon-v1.6');

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
  /**
   * 결과 갤러리 창. 결과는 화면 안에 자리를 잡지 않고 창으로 뜬다 — 3단이 콘텐츠 영역을 꽉
   * 채우고 있어 내줄 자리가 없고, 결과는 크게 봐야 하는 것이라 좁은 칸에 욱여넣을 것도 아니다.
   * 실행을 누르는 순간 열려 만드는 동안을 보여 주고, 닫아도 위 도구줄의 '결과 보기' 로 돌아온다.
   */
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);

  const compareSliderRef = useReactCompareSliderRef();

  // API key modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);

  const isClient = useIsClient();
  const apiKey = savedApiKey ?? (isClient ? localStorage.getItem('fashn_api_key') ?? '' : '');

  const activeSlotDef = useMemo(
    () => GARMENT_SLOTS.find((slot) => slot.id === activeSlot) ?? GARMENT_SLOTS[0],
    [activeSlot]
  );

  /**
   * 한 자리를 갈아끼운다. 그 자리에 있던 미리보기 URL 은 버린다 — 사진을 여러 번 바꾸는
   * 화면이라 놔두면 blob 이 쌓인다.
   */
  const setGarment = useCallback((slot: GarmentSlot, next: GarmentPick) => {
    setGarments((prev) => {
      const old = prev[slot].preview;
      if (old && old.startsWith('blob:') && old !== next.preview) URL.revokeObjectURL(old);
      return { ...prev, [slot]: next };
    });
  }, []);

  const clearGarment = useCallback(
    (slot: GarmentSlot) => setGarment(slot, EMPTY_PICK),
    [setGarment]
  );

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

  /**
   * 창이 여럿 겹친다. Esc 는 **맨 위의 것부터** 닫는다 — 결과 한 장을 크게 본 상태에서 Esc 를
   * 누르면 갤러리로 돌아가야지 통째로 닫히면 안 된다.
   */
  useEffect(() => {
    if (!isGalleryOpen && !isResultsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isResultsModalOpen && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateResult('prev');
      } else if (isResultsModalOpen && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateResult('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isResultsModalOpen) setIsResultsModalOpen(false);
        else if (!isComparisonModalOpen) setIsGalleryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, isResultsModalOpen, isComparisonModalOpen, navigateResult]);

  const handleSaveApiKey = (newApiKey: string) => {
    localStorage.setItem('fashn_api_key', newApiKey);
    setSavedApiKey(newApiKey);
    setIsApiKeyModalOpen(false);
  };

  const handleModelSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && modelExampleIndex > 0) {
      setModelExampleIndex(modelExampleIndex - 1);
    } else if (direction === 'right' && modelExampleIndex < modelExamples.length - 1) {
      setModelExampleIndex(modelExampleIndex + 1);
    }
  };

  const handleModelImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelImageFile(file);
      setModelImagePreview(URL.createObjectURL(file));
      setError(null);
    } else {
      setModelImageFile(null);
      setModelImagePreview(null);
    }
  };

  /** 올린 사진을 한 자리에 넣는다. 카탈로그에서 온 것이 아니므로 상품 정보는 비운다. */
  const handleGarmentUpload = (e: ChangeEvent<HTMLInputElement>, slot: GarmentSlot) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGarment(slot, { file, preview: URL.createObjectURL(file), product: null });
    setActiveSlot(slot);
    setError(null);
  };

  /** 주소의 사진을 File 로 바꾼다. 예시 모델 사진과 카탈로그 상품 사진이 같이 쓴다. */
  const fetchImageAsFile = async (imageUrl: string, filename: string): Promise<File> => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`사진을 내려받지 못했습니다 (HTTP ${response.status}).`);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  };

  const loadExampleModel = async (imageUrl: string) => {
    try {
      const file = await fetchImageAsFile(imageUrl, imageUrl.substring(imageUrl.lastIndexOf('/') + 1));
      setModelImageFile(file);
      setModelImagePreview(URL.createObjectURL(file));
      setError(null);
    } catch (err) {
      console.error('Failed to load example image:', err);
      setError(err instanceof Error ? err.message : '예시 모델 사진을 불러오지 못했습니다.');
    }
  };

  /**
   * 오른쪽에서 고른 상품을 지금 자리에 담는다.
   *
   * 목록에 보이는 것은 200px 축소본이라 그대로 보내면 가먼트가 뭉개진다. 피팅에 넣는 것은
   * 원본(`originalImageUrl`)이다.
   */
  const pickProduct = useCallback(
    async (product: CatalogProduct) => {
      const url = product.originalImageUrl ?? product.imageUrl;
      const slot = activeSlot;
      if (!url) {
        setError('이 상품에는 등록된 사진이 없습니다. 다른 상품을 고르거나 사진을 올려 주세요.');
        return;
      }
      setLoadingSlot(slot);
      setError(null);
      try {
        const file = await fetchImageAsFile(url, `${product.id}.jpg`);
        setGarment(slot, {
          file,
          preview: URL.createObjectURL(file),
          product: {
            id: product.id,
            name: product.name,
            brandName: product.brandName,
            catalogUrl: product.catalogUrl,
          },
        });
      } catch (err) {
        console.error('Failed to load product image:', err);
        setError(err instanceof Error ? err.message : '상품 사진을 불러오지 못했습니다.');
      } finally {
        setLoadingSlot((current) => (current === slot ? null : current));
      }
    },
    [activeSlot, setGarment]
  );

  const handleReset = () => {
    setModelImageFile(null);
    setModelImagePreview(null);
    for (const slot of GARMENT_SLOTS) clearGarment(slot.id);
    setActiveSlot('top');
    setResultGallery([]);
    setError(null);
    setSegmentationFree(true);
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

    // 피팅에 들어가는 것은 **지금 고른 자리 한 장**이다. 자리가 곧 category 라 섞이지 않는다.
    const targetGarment = garments[activeSlot].file;

    if (!modelImageFile) {
      setError('모델 이미지를 선택하거나 업로드해 주세요.');
      return;
    }
    if (!targetGarment) {
      setError(`${activeSlotDef.name} 자리가 비어 있습니다. 상품을 고르거나 사진을 올려 주세요.`);
      return;
    }

    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    // 만드는 동안도 창 안에서 보여 준다 — 눌렀는데 아무 일도 안 일어난 것처럼 보이지 않게.
    setIsGalleryOpen(true);

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

      const basePayload = {
        model_image: modelImageBase64,
        garment_image: garmentImageBase64,
        garment_photo_type: garmentPhotoType.toLowerCase(),
        category: activeSlotDef.apiCategory,
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
      // 실패했으면 창을 비켜 준다 — 무엇이 잘못됐는지는 왼쪽 컨트롤 아래에 적힌다.
      setIsGalleryOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col bg-gradient-to-b from-[#f8f9fa] to-[#edeef0] dark:from-gray-950 dark:to-gray-900 p-2.5 sm:p-3 gap-2.5"
      style={{ fontSize: '70%' }}
    >
      {/* ============================================================================== */}
      {/* TOP: Global Action Toolbar                                                     */}
      {/* ============================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 p-2 px-3 bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-2"
      >
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
            onClick={() => setIsApiKeyModalOpen(true)}
            className="flex items-center gap-1 text-[9px] h-7 px-2.5"
          >
            <Zap className="w-3 h-3 text-blue-600" />
            <span>{apiKey ? 'API Key 연동됨' : 'API Key 설정'}</span>
          </Button>

          {/* 창을 닫은 뒤 결과로 돌아오는 길. 만든 것이 없으면 갈 곳도 없어 나오지 않는다. */}
          {resultGallery.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsGalleryOpen(true)}
              className="flex items-center gap-1 text-[9px] h-7 px-2.5"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>결과 보기 ({resultGallery.length})</span>
            </Button>
          )}
        </div>

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
      {/* BODY: 3단 — 남는 세로를 전부 쓴다.                                              */}
      {/* 좁은 화면(lg 미만)에서는 위아래로 쌓이고 이 칸이 스크롤한다.                      */}
      {/* ============================================================================== */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-2.5 overflow-y-auto lg:overflow-hidden vt-scroll">
        {/* ---------------------------------------------------------------------------- */}
        {/* COLUMN 1: 모델 사진 · 실행 · 컨트롤                                            */}
        {/* ---------------------------------------------------------------------------- */}
        <div className="lg:col-span-4 min-h-0 h-full flex flex-col">
          <Card className="flex flex-col h-full min-h-0 shadow-2xs border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader className="flex-shrink-0 pb-2 pt-2.5 px-3 border-b border-gray-100 dark:border-gray-800">
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

            <CardContent className="p-2.5 flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto vt-scroll">
              {/* 1. 상단 한줄 버튼 그룹 */}
              <div className="flex-shrink-0 flex items-center justify-between gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                <label className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded shadow-2xs text-[8.5px] font-medium text-gray-800 dark:text-gray-100 cursor-pointer transition-colors text-center truncate">
                  <Upload className="w-3 h-3 text-gray-600" />
                  <span>사진 업로드</span>
                  <input type="file" onChange={handleModelImageChange} accept="image/*" className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (modelExampleIndex + 1) % modelExamples.length;
                    setModelExampleIndex(nextIdx);
                    loadExampleModel(modelExamples[nextIdx]);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded shadow-2xs text-[8.5px] font-medium text-gray-800 dark:text-gray-100 cursor-pointer transition-colors text-center truncate"
                >
                  <RefreshCw className="w-3 h-3 text-gray-600" />
                  <span>
                    샘플 모델 ({modelExampleIndex + 1}/{modelExamples.length})
                  </span>
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

              {/* 2. 모델 미리보기 — 남는 세로를 여기가 먹는다. */}
              <div className="flex-1 min-h-[160px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {modelImagePreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="h-full w-full flex items-center justify-center"
                    >
                      <div className="h-full aspect-[3/4] max-w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xs flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
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
                      className="h-full aspect-[3/4] max-w-full border-2 border-dashed border-gray-300/80 dark:border-gray-700 rounded-lg relative overflow-hidden bg-gray-50/70 dark:bg-gray-800/50 group"
                    >
                      <div className="w-full h-full relative cursor-pointer">
                        <Image
                          src={modelExamples[modelExampleIndex]}
                          alt={`Model Example ${modelExampleIndex + 1}`}
                          width={280}
                          height={350}
                          className="w-full h-full object-contain pointer-events-none opacity-85 p-1.5"
                        />
                        <div
                          onClick={() => loadExampleModel(modelExamples[modelExampleIndex])}
                          className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors flex flex-col items-center justify-center p-2 text-center"
                        >
                          <div className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 px-2.5 py-1 rounded-full text-[8.5px] font-semibold shadow-md backdrop-blur-sm mb-1.5">
                            클릭하여 이 모델 선택
                          </div>
                          <span className="text-[8px] text-white/90">또는 상단 [사진 업로드] 클릭</span>
                        </div>

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

              {/* 3. 실행 */}
              <div className="flex-shrink-0 flex gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                <Button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !modelImageFile}
                  loading={isLoading}
                  className="flex-1 h-8.5 text-[10.5px] font-semibold bg-gray-900 hover:bg-black text-white shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  {isLoading ? '가상 피팅 생성 중...' : `Run Try-On · ${activeSlotDef.name}`}
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

              {/* 4. 컨트롤 */}
              <div className="flex-shrink-0 p-2 bg-gray-50/90 dark:bg-gray-850/80 rounded-lg border border-gray-200/70 dark:border-gray-750 space-y-2">
                <div className="flex items-center justify-between text-[9px] font-semibold text-gray-800 dark:text-gray-200">
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-gray-500" />
                    <span>피팅 컨트롤 (Controls)</span>
                  </div>
                  <span className="text-[8px] font-normal text-gray-500">모드: {mode}</span>
                </div>

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

                <div className="flex items-center justify-between gap-2 text-[8.5px]">
                  <Checkbox
                    checked={segmentationFree}
                    onChange={(e) => setSegmentationFree(e.target.checked)}
                    label="Auto Segmentation"
                    description="인물/의류 자동 영역 분리"
                    labelClassName="text-[9px]"
                    descriptionClassName="text-[8px] text-gray-500 dark:text-gray-400"
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
                        labelClassName="text-[9px]"
                        descriptionClassName="text-[8px] text-gray-500 dark:text-gray-400"
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
        {/* COLUMN 2: 옷 세 자리 — 콘텐츠 영역의 세로를 그대로 쓴다                          */}
        {/* ---------------------------------------------------------------------------- */}
        <div className="lg:col-span-3 min-h-0 h-full flex flex-col">
          <Card className="h-full min-h-0 flex flex-col shadow-2xs border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader className="flex-shrink-0 pb-2 pt-2.5 px-3 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Shirt className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span>의류 선택 (자리마다 1장)</span>
                </div>
                <span className="text-[8.5px] font-normal text-gray-500">
                  피팅 대상:{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {activeSlotDef.name}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>

            {/*
             * 세 자리가 이 단의 세로를 나눠 갖는다 — 한 자리가 30%(`basis-[30%]`)이고 남는 것은
             * 셋이 똑같이 더 가진다. 자리가 커진 만큼 사진도 자리 높이에 맞춰 커지므로, 무엇을
             * 골랐는지 따로 크게 보지 않아도 알아볼 수 있다.
             */}
            <CardContent className="p-2.5 flex-1 min-h-0 flex flex-col gap-1.5">
              {GARMENT_SLOTS.map((slot, index) => {
                const pick = garments[slot.id];
                const isActive = activeSlot === slot.id;
                const Icon = slot.icon;
                return (
                  <div
                    key={slot.id}
                    onClick={() => setActiveSlot(slot.id)}
                    className={cn(
                      'flex-1 basis-[30%] min-h-0 flex flex-col p-2 rounded-lg border transition-all cursor-pointer',
                      isActive
                        ? 'border-gray-900/80 dark:border-gray-300 bg-gray-50/70 dark:bg-gray-850/60 shadow-2xs'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300'
                    )}
                  >
                    <div className="flex-shrink-0 flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-4.5 h-4.5 rounded-full text-[8px] font-bold flex items-center justify-center',
                            isActive
                              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          )}
                        >
                          {index + 1}
                        </span>
                        <Icon className="w-3 h-3 text-gray-500" />
                        <span className="font-semibold text-[10px] text-gray-900 dark:text-gray-100">
                          {slot.name}
                        </span>
                        {pick.preview && (
                          <span className="text-[7px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                            등록됨
                          </span>
                        )}
                      </div>

                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="text-[8px] font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-2xs"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>사진 올리기</span>
                        <input
                          type="file"
                          onChange={(e) => handleGarmentUpload(e, slot.id)}
                          accept="image/*"
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-h-0 flex items-stretch gap-2">
                      {/* 사진 한 장 — 자리 높이를 꽉 채우고 너비는 3:4 로 따라온다. */}
                      <div className="h-full aspect-[3/4] flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center relative group">
                        {loadingSlot === slot.id ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : pick.preview ? (
                          <>
                            <Image
                              src={pick.preview}
                              alt={`${slot.name} 미리보기`}
                              width={240}
                              height={320}
                              className="w-full h-full object-contain p-0.5"
                              unoptimized
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearGarment(slot.id);
                              }}
                              title={`${slot.name} 비우기`}
                              className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </>
                        ) : (
                          <Icon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                        )}
                      </div>

                      {/* 무엇이 담겼는지 */}
                      <div className="flex-1 min-w-0 overflow-y-auto vt-scroll">
                        {pick.product ? (
                          <>
                            <p className="text-[9px] font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                              {pick.product.name}
                            </p>
                            <p className="text-[8px] text-gray-500 truncate mt-0.5">
                              {pick.product.brandName ?? '브랜드 미상'}
                            </p>
                            <a
                              href={pick.product.catalogUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 mt-1 text-[8px] text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <ExternalLink className="w-2 h-2" />
                              <span>판매 페이지</span>
                            </a>
                          </>
                        ) : pick.preview ? (
                          <p className="text-[8px] text-gray-500 break-all">
                            직접 올린 사진 · {pick.file?.name}
                          </p>
                        ) : (
                          <p className="text-[8px] text-gray-400 leading-relaxed">
                            {slot.hint}
                            <br />
                            오른쪽에서 상품을 고르거나 사진을 올리세요.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------------------------------------- */}
        {/* COLUMN 3: 착장 상품 찾기 — 내재화된 카탈로그                                    */}
        {/* ---------------------------------------------------------------------------- */}
        <div className="lg:col-span-3 min-h-0 h-full flex flex-col">
          <Card className="flex flex-col h-full min-h-0 shadow-2xs border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader className="flex-shrink-0 pb-2 pt-2.5 px-3 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShoppingBag className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span>착장 상품 찾기</span>
                </div>
                <span className="text-[8px] font-normal text-gray-500">내재화 카탈로그</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-2.5 flex-1 min-h-0">
              <ProductSearch
                targetLabel={activeSlotDef.name}
                pickedId={garments[activeSlot].product?.id ?? null}
                onPick={pickProduct}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 가상 피팅 결과 — 창(modal)                                                      */}
      {/* 3단이 콘텐츠 영역을 꽉 채우므로 결과는 화면 안에 자리를 잡지 않는다. 실행을 누르면   */}
      {/* 이 창이 열려 만드는 동안을 보여 주고, 다 되면 그 자리에 결과가 깔린다.             */}
      {/* ============================================================================== */}
      <AnimatePresence>
        {isGalleryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ fontSize: '70%' }}
            onClick={() => setIsGalleryOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl h-[85vh] flex flex-col rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
            >
              <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-900 dark:text-gray-100">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>가상 피팅 결과</span>
                  {!isLoading && resultGallery.length > 0 && (
                    <span className="text-[8.5px] font-normal text-gray-500">
                      {activeSlotDef.name} · {resultGallery.length}장
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {resultGallery.length > 1 && !isLoading && (
                    <>
                      {isComparisonMode && (
                        <span className="text-[9px] text-gray-600 dark:text-gray-400">
                          비교할 2장을 고르세요 ({selectedResults.length}/2)
                        </span>
                      )}
                      <Button
                        variant={isComparisonMode ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setIsComparisonMode(!isComparisonMode);
                          setSelectedResults([]);
                        }}
                        className="flex items-center gap-1 text-[9px] h-6 px-2"
                      >
                        {isComparisonMode ? (
                          <>
                            <X className="h-3 w-3" />
                            <span>취소</span>
                          </>
                        ) : (
                          <span>⚖️ 비교 모드</span>
                        )}
                      </Button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsGalleryOpen(false)}
                    title="닫기 (Esc)"
                    className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto vt-scroll p-3">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full border-3 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 animate-spin" />
                      <Sparkles className="h-5 w-5 text-amber-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-[11px] font-medium animate-pulse">
                      FASHN AI 가상 피팅 이미지를 생성하고 있습니다...
                    </p>
                  </div>
                ) : resultGallery.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center text-gray-400">
                    <ShoppingBag className="w-7 h-7 text-gray-300 dark:text-gray-700" />
                    <p className="text-[10px]">아직 만든 결과가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                              if (newSelection.length === 2) setIsComparisonModalOpen(true);
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
                  </div>
                )}
              </div>
            </motion.div>
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
                    <ReactCompareSliderImage src={resultGallery[selectedResults[0]]} alt="Result 1" />
                  }
                  itemTwo={
                    <ReactCompareSliderImage src={resultGallery[selectedResults[1]]} alt="Result 2" />
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
  );
}
