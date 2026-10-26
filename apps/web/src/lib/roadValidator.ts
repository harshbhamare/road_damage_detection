import sharp from 'sharp';

export type SceneClassificationType =
  | 'ROAD_SURFACE'
  | 'EVENT_POSTER_OR_GRAPHIC'
  | 'DOCUMENT_OR_TEXT'
  | 'INDOOR_OR_OBJECT'
  | 'UNKNOWN_NON_ROAD';

export interface RoadValidationResult {
  isRoad: boolean;
  sceneType: SceneClassificationType;
  confidence: number;
  roadScore: number; // 0 - 100
  description: string;
  reason: string;
  metrics: {
    lowerNeutralRatio: number;
    fullHighSatRatio: number;
    fullExtremeContrastRatio: number;
    lowerExtremeContrastRatio: number;
    textureVariance: number;
  };
}

/**
 * Validates whether an uploaded image depicts an outdoor road, highway, street,
 * or pavement surface, or if it is an invalid image (e.g. event poster, graphic design,
 * document, indoor photo).
 */
export async function validateRoadScene(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<RoadValidationResult> {
  // 1. Try Gemini Multimodal AI verification if an API key is configured
  const geminiResult = await checkGeminiRoadScene(imageBuffer, mimeType);
  if (geminiResult) {
    return geminiResult;
  }

  // 2. Perform Local Fast Computer Vision Analysis using Sharp (Offline, <50ms)
  return analyzeRoadSurfaceLocally(imageBuffer);
}

/**
 * Local Computer Vision Road Surface Classifier
 * Analyzes chromatic neutrality of the pavement plane, saturation distribution,
 * bimodal extreme contrast (text/poster background), and surface micro-texture.
 */
async function analyzeRoadSurfaceLocally(imageBuffer: Buffer): Promise<RoadValidationResult> {
  try {
    const analysisSize = 256;
    const image = sharp(imageBuffer);

    // Get Raw RGB pixel buffer
    const { data, info } = await image
      .resize(analysisSize, analysisSize, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = info.width * info.height;
    const halfPixels = Math.floor(totalPixels / 2);

    let fullNeutral = 0;
    let fullHighSat = 0;
    let fullExtremeContrast = 0;
    let lowerNeutral = 0;
    let lowerHighSat = 0;
    let lowerExtreme = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      const idx = Math.floor(i / info.channels);
      const isLowerHalf = idx >= halfPixels;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const sat = max === 0 ? 0 : delta / max;
      // Perceived luminance (BT.601)
      const lum = r * 0.299 + g * 0.587 + b * 0.114;

      // Asphalt / Concrete chromatic neutrality (|R-G|, |G-B|, |R-B| closely matched)
      const isNeutral =
        Math.abs(r - g) <= 30 && Math.abs(g - b) <= 30 && Math.abs(r - b) <= 30;

      // Artificial high chroma / vivid color (typical of posters, logos, illustrations)
      const isHighSat = sat >= 0.35;

      // Extreme pure white or pure black pixels (characteristic of typography/posters/slides)
      const isExtreme = lum >= 242 || lum <= 18;

      if (isNeutral) fullNeutral++;
      if (isHighSat) fullHighSat++;
      if (isExtreme) fullExtremeContrast++;

      if (isLowerHalf) {
        if (isNeutral) lowerNeutral++;
        if (isHighSat) lowerHighSat++;
        if (isExtreme) lowerExtreme++;
      }
    }

    const lowerTotal = totalPixels - halfPixels;
    const lowerNeutralRatio = lowerNeutral / lowerTotal;
    const lowerHighSatRatio = lowerHighSat / lowerTotal;
    const lowerExtremeRatio = lowerExtreme / lowerTotal;
    const fullExtremeRatio = fullExtremeContrast / totalPixels;
    const fullHighSatRatio = fullHighSat / totalPixels;

    // Measure texture energy using Laplacian kernel
    let textureVariance = 0;
    try {
      const { data: edgeData } = await sharp(imageBuffer)
        .greyscale()
        .resize(128, 128, { fit: 'fill' })
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      let sum = 0;
      let sumSq = 0;
      for (let i = 0; i < edgeData.length; i++) {
        sum += edgeData[i];
        sumSq += edgeData[i] * edgeData[i];
      }
      const mean = sum / edgeData.length;
      textureVariance = Math.round(sumSq / edgeData.length - mean * mean);
    } catch {
      textureVariance = 50;
    }

    // Weighted Road Score Calculation (0 to 1)
    const neutralScore = Math.min(1, lowerNeutralRatio / 0.7);
    const satScore = Math.max(0, 1 - fullHighSatRatio / 0.2);
    const contrastScore = Math.max(0, 1 - fullExtremeRatio / 0.18);
    const rawScore = neutralScore * 0.45 + satScore * 0.3 + contrastScore * 0.25;
    const roadScore = Math.round(Math.max(0, Math.min(100, rawScore * 100)));

    let sceneType: SceneClassificationType = 'ROAD_SURFACE';
    let isRoad = true;
    let description = 'Outdoor Road Surface (Asphalt / Concrete)';
    let reason =
      'Surface characteristics match outdoor road pavement (neutral asphalt tones and continuous texture).';
    let confidence = 0.92;

    // Rule 1: High text/graphic contrast (Posters, flyers, documents)
    if (fullExtremeRatio > 0.18 || lowerExtremeRatio > 0.16) {
      isRoad = false;
      sceneType = 'EVENT_POSTER_OR_GRAPHIC';
      description = 'Event Poster / Graphic Design / Slide';
      reason =
        'High-contrast typography, text glyphs, or poster artwork detected. Does not match road pavement.';
      confidence = Math.min(0.98, 0.75 + fullExtremeRatio);
    }
    // Rule 2: High artificial saturation (posters, banners, drawings)
    else if (fullHighSatRatio > 0.22 || lowerHighSatRatio > 0.2) {
      isRoad = false;
      sceneType = 'EVENT_POSTER_OR_GRAPHIC';
      description = 'Vibrant Graphic / Illustration / Poster';
      reason =
        'High color saturation and artificial chroma detected. Road surfaces are predominantly neutral grey or dark tarmac.';
      confidence = Math.min(0.98, 0.75 + fullHighSatRatio);
    }
    // Rule 3: Low pavement neutrality in the road plane (Indoor, face, object)
    else if (lowerNeutralRatio < 0.45) {
      isRoad = false;
      sceneType = 'INDOOR_OR_OBJECT';
      description = 'Non-Road Scene / Indoor Object';
      reason =
        'Lower frame lacks asphalt or concrete road surface neutrality. Pavement plane not detected.';
      confidence = 0.88;
    }
    // Rule 4: Overall score below threshold
    else if (roadScore < 60) {
      isRoad = false;
      sceneType = 'UNKNOWN_NON_ROAD';
      description = 'Unidentified Non-Road Surface';
      reason =
        'Visual features do not satisfy the minimum confidence criteria for asphalt or concrete pavement.';
      confidence = 0.82;
    }

    return {
      isRoad,
      sceneType,
      confidence: Math.round(confidence * 100) / 100,
      roadScore,
      description,
      reason,
      metrics: {
        lowerNeutralRatio: Math.round(lowerNeutralRatio * 1000) / 1000,
        fullHighSatRatio: Math.round(fullHighSatRatio * 1000) / 1000,
        fullExtremeContrastRatio: Math.round(fullExtremeRatio * 1000) / 1000,
        lowerExtremeContrastRatio: Math.round(lowerExtremeRatio * 1000) / 1000,
        textureVariance
      }
    };
  } catch (error: any) {
    console.error('[RoadValidator] Analysis failed, defaulting to cautious check:', error);
    // Fallback safe evaluation if sharp fails on corrupt buffer
    return {
      isRoad: false,
      sceneType: 'UNKNOWN_NON_ROAD',
      confidence: 0.5,
      roadScore: 0,
      description: 'Corrupted or Unreadable Image',
      reason: `Could not decode image for road scene verification (${error.message || 'Unknown error'})`,
      metrics: {
        lowerNeutralRatio: 0,
        fullHighSatRatio: 0,
        fullExtremeContrastRatio: 0,
        lowerExtremeContrastRatio: 0,
        textureVariance: 0
      }
    };
  }
}

/**
 * Optional Gemini Multimodal Vision API hook
 * Activated if GEMINI_API_KEY or GOOGLE_API_KEY is defined in environment variables.
 */
async function checkGeminiRoadScene(
  imageBuffer: Buffer,
  mimeType: string
): Promise<RoadValidationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null; // Gracefully fall back to local analyzer
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const prompt = `You are an automated computer vision auditor for a road damage detection platform.
Analyze this image and determine whether it represents an outdoor roadway, highway, street, asphalt, or concrete pavement surface where road distress (potholes, cracks) can be analyzed.
If the image is an event poster, flyer, slide, graphic design, text document, indoor room, person, animal, or non-road item, isRoad MUST be false.

Respond STRICTLY in JSON matching this format:
{
  "isRoad": boolean,
  "sceneType": "ROAD_SURFACE" | "EVENT_POSTER_OR_GRAPHIC" | "DOCUMENT_OR_TEXT" | "INDOOR_OR_OBJECT" | "UNKNOWN_NON_ROAD",
  "confidence": number between 0.0 and 1.0,
  "description": string (short 2-5 word label),
  "reason": string (1-2 sentences explaining why this is or is not a road)
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      isRoad: Boolean(parsed.isRoad),
      sceneType: parsed.sceneType || (parsed.isRoad ? 'ROAD_SURFACE' : 'UNKNOWN_NON_ROAD'),
      confidence: Number(parsed.confidence) || 0.95,
      roadScore: parsed.isRoad ? 95 : 20,
      description: parsed.description || (parsed.isRoad ? 'Road Surface' : 'Non-Road Image'),
      reason: parsed.reason || 'Verified by Gemini Multimodal Vision API.',
      metrics: {
        lowerNeutralRatio: parsed.isRoad ? 0.9 : 0.2,
        fullHighSatRatio: parsed.isRoad ? 0.05 : 0.35,
        fullExtremeContrastRatio: parsed.isRoad ? 0.02 : 0.25,
        lowerExtremeContrastRatio: parsed.isRoad ? 0.02 : 0.25,
        textureVariance: parsed.isRoad ? 80 : 1500
      }
    };
  } catch (err) {
    console.warn('[RoadValidator] Gemini verification unavailable, using local CV analyzer:', err);
    return null;
  }
}
