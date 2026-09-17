import { supabase } from './supabase';
import { contentService } from './content';

export type SOPCategory = 'exterior' | 'interior' | 'preparation' | 'final' | 'safety';

export interface MasterSOPItem {
  id: string;
  category: SOPCategory;
  code: string;
  title: string;
  stepNumber: number;
  shortSummary: string;
  detailedInstructions: string;
  chemicalIds?: string[];
  tools?: string[];
  ricksTips?: string;
  dilutionRatio?: string;
  isActive: boolean;
  updatedAt?: string;
}

export const MASTER_SOPS_META_KEY = 'master_sops_v1';

// Initial master seed data combining TrainingManual, Rick's Tips, and Service Checklist standards
export const DEFAULT_MASTER_SOPS: MasterSOPItem[] = [
  // EXTERIOR PROCESS (8 Steps)
  {
    id: 'ext-1',
    category: 'exterior',
    code: 'EXT-01',
    title: 'Wheels, Tires & Wheel Wells',
    stepNumber: 1,
    shortSummary: 'Clean wheels, tires, and wheel wells before touching paint.',
    detailedInstructions: 'Always start with wheels while the vehicle is cool and out of direct sun. Apply non-acid or acid-free wheel cleaner, scrub tires with a stiff brush, clean barrel with a microfiber wheel brush, and pressure wash wheel wells thoroughly.',
    chemicalIds: ['brake-buster', 'all-purpose-cleaner'],
    tools: ['Wheel Brush', 'Tire Scrub Brush', 'Pressure Washer'],
    ricksTips: 'Work on one wheel at a time. Never let wheel cleaner dry on hot rims or polished aluminum.',
    dilutionRatio: '4:1',
    isActive: true,
  },
  {
    id: 'ext-2',
    category: 'exterior',
    code: 'EXT-02',
    title: 'Pre-Rinse & Bug Removal',
    stepNumber: 2,
    shortSummary: 'Loosen heavy road grime and bugs before contact washing.',
    detailedInstructions: 'Rinse from top to bottom. Spray citrus-based bug remover on front bumper, hood, side mirrors, and lower panels. Allow to dwell for 2 minutes without drying.',
    chemicalIds: ['bug-remover', 'citrus-degreaser'],
    tools: ['Bug Sponge', 'Pressure Washer'],
    ricksTips: 'Dwelling time does the work. Do not scrub hard with sponges or you risk marring the clear coat.',
    dilutionRatio: '10:1',
    isActive: true,
  },
  {
    id: 'ext-3',
    category: 'exterior',
    code: 'EXT-03',
    title: 'Foam Cannon Pre-Soak',
    stepNumber: 3,
    shortSummary: 'Encapsulate dirt particles with thick lubricating foam.',
    detailedInstructions: 'Apply high-pH pre-soak foam to entire vehicle starting from lower panels up to top. Allow foam to dwell for 3-5 minutes to lift dirt before pressure rinsing.',
    chemicalIds: ['foam-soap', 'strip-wash'],
    tools: ['Foam Cannon', 'Pressure Washer'],
    ricksTips: 'Thick foam suspends dirt away from paint, drastically reducing swirl marks during contact wash.',
    dilutionRatio: '10:1',
    isActive: true,
  },
  {
    id: 'ext-4',
    category: 'exterior',
    code: 'EXT-04',
    title: 'Two-Bucket Contact Wash',
    stepNumber: 4,
    shortSummary: 'Hand wash panels using clean microfiber mitts and grit guards.',
    detailedInstructions: 'Use Two-Bucket Method with Grit Guards. Wash straight lines only—never circular motions. Wash top panels first (roof, hood, trunk), then side panels, leaving lower rocker panels for last.',
    chemicalIds: ['ph-neutral-shampoo'],
    tools: ['Microfiber Mitts', 'Grit Guard Buckets'],
    ricksTips: 'Flip or change mitts after lower panels. Never touch the roof with a mitt that touched lower rocker panels.',
    dilutionRatio: '128:1',
    isActive: true,
  },
  {
    id: 'ext-5',
    category: 'exterior',
    code: 'EXT-05',
    title: 'Chemical Decontamination (Iron & Tar)',
    stepNumber: 5,
    shortSummary: 'Dissolve embedded iron brake dust and road tar.',
    detailedInstructions: 'Spray Iron Remover on cool paint and wheels. Watch for purple color reaction indicating iron dissolution (dwell 3-5 mins). Apply Tar Remover to lower quarter panels if needed. Rinse thoroughly.',
    chemicalIds: ['iron-remover', 'tar-remover'],
    tools: ['Pressure Washer'],
    ricksTips: 'Perform iron decontamination out of sunlight. Never allow iron fallout remover to dry on glass or trim.',
    dilutionRatio: 'RTU',
    isActive: true,
  },
  {
    id: 'ext-6',
    category: 'exterior',
    code: 'EXT-06',
    title: 'Mechanical Clay Bar Treatment',
    stepNumber: 6,
    shortSummary: 'Remove remaining bonded surface contaminants.',
    detailedInstructions: 'Lubricate paint generously with Clay Lube or diluted shampoo. Glide clay bar or clay towel gently across paint until smooth to touch. Wipe clean with microfiber.',
    chemicalIds: ['clay-lubricant'],
    tools: ['Fine Clay Bar', 'Clay Mitt'],
    ricksTips: 'Knead clay frequently to expose clean surface. If dropped on ground, throw it away immediately!',
    dilutionRatio: '16:1',
    isActive: true,
  },
  {
    id: 'ext-7',
    category: 'exterior',
    code: 'EXT-07',
    title: 'Drying & Blow-Out',
    stepNumber: 7,
    shortSummary: 'Safely dry paint and blow out trapped water from crevices.',
    detailedInstructions: 'Use leaf blower or warm air dryer for emblems, grilles, door jambs, and lug nuts. Follow up with plush twist-loop microfiber drying towel sprayed with drying aid/spray wax.',
    chemicalIds: ['drying-aid', 'spray-sealant'],
    tools: ['Car Blower', 'Plush Drying Towel'],
    ricksTips: 'Air drying door jambs prevents drips down fresh paint after client pickup.',
    dilutionRatio: 'RTU',
    isActive: true,
  },
  {
    id: 'ext-8',
    category: 'exterior',
    code: 'EXT-08',
    title: 'Paint Protection & Trim Dressing',
    stepNumber: 8,
    shortSummary: 'Apply sealant or ceramic coating and dress tires and plastic trim.',
    detailedInstructions: 'Apply ceramic spray sealant, wax, or coating according to product instructions. Wipe clean with high-GSM microfiber. Apply water-based non-greasy tire shine and restore exterior trim.',
    chemicalIds: ['ceramic-spray', 'tire-dressing', 'trim-restorer'],
    tools: ['Microfiber Applicator', 'Buffing Towel'],
    ricksTips: 'Less is more with tire dressing. Wipe off excess after 5 minutes to prevent sling on paint during test drive.',
    dilutionRatio: 'RTU',
    isActive: true,
  },

  // INTERIOR PROCESS (10 Steps)
  {
    id: 'int-1',
    category: 'interior',
    code: 'INT-01',
    title: 'Trash Removal & Inspection',
    stepNumber: 1,
    shortSummary: 'Clear personal items and inspect interior condition.',
    detailedInstructions: 'Place customer belongings into clear bag. Remove all trash, floor mats, and car seats (if permitted). Note any pre-existing tears, stains, or electronic malfunctions.',
    chemicalIds: [],
    tools: ['Belongings Bag', 'Pre-Inspection Form'],
    ricksTips: 'Always check under seats and glove compartment before starting heavy vacuuming.',
    dilutionRatio: 'N/A',
    isActive: true,
  },
  {
    id: 'int-2',
    category: 'interior',
    code: 'INT-02',
    title: 'Compressed Air Blow-Out',
    stepNumber: 2,
    shortSummary: 'Blow trapped debris out of vents, seams, and carpet fibers.',
    detailedInstructions: 'Use compressed air blow gun (Tornador or air nozzle) to blow dust and sand out from under seat rails, dashboard seams, cup holders, and carpet fibers toward center floor.',
    chemicalIds: [],
    tools: ['Air Blow Gun', 'Tornador'],
    ricksTips: 'Wear safety glasses and mask during blow-out phase. Work from top to bottom.',
    dilutionRatio: 'N/A',
    isActive: true,
  },
  {
    id: 'int-3',
    category: 'interior',
    code: 'INT-03',
    title: 'Initial Heavy Vacuuming',
    stepNumber: 3,
    shortSummary: 'Vacuum carpets, seats, trunk, and crevices.',
    detailedInstructions: 'Vacuum all carpeted areas, cloth seats, trunk, and under seats using stiff carpet brush to agitate embedded dirt. Use crevice tool for tight spaces.',
    chemicalIds: [],
    tools: ['Shop Vac', 'Carpet Scrub Brush', 'Crevice Tool'],
    ricksTips: 'Brush carpet in crosshatch patterns to lift stubborn pet hair and deep sand.',
    dilutionRatio: 'N/A',
    isActive: true,
  },
  {
    id: 'int-4',
    category: 'interior',
    code: 'INT-04',
    title: 'Floor Mat Deep Cleaning',
    stepNumber: 4,
    shortSummary: 'Clean rubber and carpet floor mats.',
    detailedInstructions: 'Rubber mats: Degrease, pressure wash, and dry. Carpet mats: Apply carpet cleaner, scrub, extract/vacuum, and hang to dry.',
    chemicalIds: ['all-purpose-cleaner', 'carpet-cleaner'],
    tools: ['Pressure Washer', 'Drill Brush'],
    ricksTips: 'Ensure mats are 100% dry before reinstalling to avoid mildew odors.',
    dilutionRatio: '10:1',
    isActive: true,
  },
  {
    id: 'int-5',
    category: 'interior',
    code: 'INT-05',
    title: 'Dashboard, Console & Door Panels',
    stepNumber: 5,
    shortSummary: 'Clean all hard interior surfaces, vents, and buttons.',
    detailedInstructions: 'Apply pH-neutral interior cleaner with soft-bristle detailing brushes into vents, switches, and cup holders. Wipe clean with damp microfiber towel.',
    chemicalIds: ['interior-cleaner'],
    tools: ['Detailing Brushes', 'Microfiber Towel'],
    ricksTips: 'Never spray cleaner directly onto navigation screens or electrical switches—spray onto brush or towel first.',
    dilutionRatio: '10:1',
    isActive: true,
  },
  {
    id: 'int-6',
    category: 'interior',
    code: 'INT-06',
    title: 'Leather & Fabric Seat Cleaning',
    stepNumber: 6,
    shortSummary: 'Deep clean seat upholstery and condition leather.',
    detailedInstructions: 'Leather: Apply gentle leather cleaner with horsehair brush, wipe clean, and apply matte conditioner. Fabric: Pre-treat stains, agitate, and heat extract.',
    chemicalIds: ['leather-cleaner', 'leather-conditioner', 'fabric-cleaner'],
    tools: ['Horsehair Brush', 'Hot Water Extractor'],
    ricksTips: 'Real leather needs breathable conditioner. Avoid glossy silicone dressings on steering wheels or seats.',
    dilutionRatio: '10:1',
    isActive: true,
  },
  {
    id: 'int-7',
    category: 'interior',
    code: 'INT-07',
    title: 'Carpet & Upholstery Extraction',
    stepNumber: 7,
    shortSummary: 'Hot water extraction for deep carpet stains and odors.',
    detailedInstructions: 'Spray enzyme cleaner or carpet pre-spray. Agitate with drill brush. Extract with hot water extractor using minimal water to avoid over-wetting underlayment padding.',
    chemicalIds: ['enzyme-cleaner', 'carpet-extractor-flush'],
    tools: ['Extractor Machine', 'Drill Brush'],
    ricksTips: 'Perform extra dry passes with extractor wand to pull out max moisture and speed up drying time.',
    dilutionRatio: '20:1',
    isActive: true,
  },
  {
    id: 'int-8',
    category: 'interior',
    code: 'INT-08',
    title: 'Streak-Free Glass Cleaning',
    stepNumber: 8,
    shortSummary: 'Clean interior windshield and all windows to perfection.',
    detailedInstructions: 'Use dedicated glass microfiber towel and alcohol-based ammonia-free glass cleaner. Spray towel, wipe in straight lines, then flip to dry side for final buff.',
    chemicalIds: ['glass-cleaner'],
    tools: ['Glass Microfiber Towel', 'Reach Tool'],
    ricksTips: 'Roll windows down 1 inch to clean top edges where glass seals into door frames.',
    dilutionRatio: 'RTU',
    isActive: true,
  },
  {
    id: 'int-9',
    category: 'interior',
    code: 'INT-09',
    title: 'UV Surface Dressing & Protection',
    stepNumber: 9,
    shortSummary: 'Apply non-greasy UV protectant to dash and plastic trim.',
    detailedInstructions: 'Wipe all vinyl, plastic, and door seals with non-reflective UV protectant. Leaves factory matte finish and prevents sun fading.',
    chemicalIds: ['uv-protectant'],
    tools: ['Microfiber Applicator Pad'],
    ricksTips: 'Clients hate shiny glare on the windshield. Always use zero-glare matte UV protection on dash tops.',
    dilutionRatio: 'RTU',
    isActive: true,
  },
  {
    id: 'int-10',
    category: 'interior',
    code: 'INT-10',
    title: 'Final Quality Inspection & Scent',
    stepNumber: 10,
    shortSummary: 'Perform final line-of-sight inspection and subtle fragrance.',
    detailedInstructions: 'Inspect instrument cluster for streaks, re-vacuum stray dust, replace floor mats in precise position, and apply premium mist odor eliminator if requested.',
    chemicalIds: ['odor-eliminator'],
    tools: ['Inspection Light'],
    ricksTips: 'Use inspection light at 45-degree angle to catch glass haze before client delivery.',
    dilutionRatio: 'RTU',
    isActive: true,
  }
];

let sopMemoryCache: MasterSOPItem[] | null = null;

export const sopService = {
  /**
   * Fetch master SOP list from Supabase or fallback to defaults
   */
  getMasterSOPs: async (): Promise<MasterSOPItem[]> => {
    if (sopMemoryCache && sopMemoryCache.length > 0) {
      return sopMemoryCache;
    }

    try {
      const metaRecord = await contentService.getServiceMeta(MASTER_SOPS_META_KEY);
      if (metaRecord && metaRecord.meta && Array.isArray(metaRecord.meta.sops) && metaRecord.meta.sops.length > 0) {
        sopMemoryCache = metaRecord.meta.sops;
        return sopMemoryCache!;
      }
    } catch (e) {
      console.warn('Failed to load master SOPs from Supabase meta, using defaults', e);
    }

    // Default fallback
    sopMemoryCache = DEFAULT_MASTER_SOPS;
    return sopMemoryCache;
  },

  /**
   * Synchronous getter from local memory cache
   */
  getMasterSOPsSync: (): MasterSOPItem[] => {
    return sopMemoryCache || DEFAULT_MASTER_SOPS;
  },

  /**
   * Save updated master SOP list to Supabase and update local cache
   */
  saveMasterSOPs: async (sops: MasterSOPItem[]): Promise<boolean> => {
    sopMemoryCache = sops;
    try {
      await contentService.upsertServiceMeta({
        key: MASTER_SOPS_META_KEY,
        title: 'Master SOP System Catalog',
        description: 'Single source of truth for all procedural SOP steps, chemical guidance, and tips.',
        meta: { sops, updatedAt: new Date().toISOString() }
      });
      window.dispatchEvent(new CustomEvent('master-sops-updated', { detail: { sops } }));
      return true;
    } catch (e) {
      console.error('Failed to save master SOPs to Supabase:', e);
      return false;
    }
  },

  /**
   * Helper to retrieve a single SOP item by ID or Code
   */
  getSOPByIdOrCode: (codeOrId: string, sops?: MasterSOPItem[]): MasterSOPItem | undefined => {
    const list = sops || sopMemoryCache || DEFAULT_MASTER_SOPS;
    const target = codeOrId.toLowerCase().trim();
    return list.find(s => s.id.toLowerCase() === target || s.code.toLowerCase() === target);
  }
};
