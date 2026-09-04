/** @type {import('next').NextConfig} */

// FASHN try-on 결과 이미지 및 예제 이미지 호스트
const fashnImageHosts = [
  'cilsrdpvqtgutxprdofn.supabase.co', // FASHN 로고
  'cdn.fashn.ai', // FASHN API 결과 이미지
  'api.fashn.ai',
  'app.fashn.ai', // FASHN 예제 모델 이미지
  'images.pexels.com', // 예제 가먼트 이미지
  'v3.fal.media',
  'custom-icon-badges.demolab.com',
  'img.shields.io',
  'mjc1kvq4a1.ufs.sh', // UploadThing 예제 이미지
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...fashnImageHosts.map((hostname) => ({
        protocol: 'https',
        hostname,
      })),
    ],
  },
};

export default nextConfig;
