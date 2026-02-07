
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Sparkles, BookOpen, AlertTriangle, Info } from "lucide-react";

export const EducationalContent = () => {
    const categories = [
        {
            title: "General Auto Detailing vs. DIY Cleaning",
            icon: <Info className="w-5 h-5 text-blue-500" />,
            questions: [
                {
                    q: "Why is professional detailing different from washing my car in the driveway?",
                    a: "Driveway washing typically uses dish soaps or generic cleaners that can strip protective wax and damage clear coats over time. Professional detailing uses pH-balanced, surface-specific chemicals designed to lift dirt safely without abrasion. We also employ multi-bucket methods and grit guards to prevent the swirl marks commonly caused by sponges and brushes used in DIY settings."
                },
                {
                    q: "Can't I just use the same cleaner for everything?",
                    a: "No. Every surface in your vehicle—leather, plastic, glass, clear coat, and rubber—requires a different chemical composition. An acidic cleaner meant for wheels can permanently damage interior leather, while an interior dressing usually smears on glass. Professionals use dedicated products for each substrate to ensure effective cleaning without chemical burns or residue."
                },
                {
                    q: "What is the difference between a 'car wash' and 'detailing'?",
                    a: "A car wash is a superficial removal of loose dirt, often using automated machines that cause micro-scratches. Detailing is a systematic, restorative process involving decontamination, paint correction, interior deep cleaning, and long-term protection. While a wash takes minutes, a proper detail takes hours to ensure every crevice is cleaned and protected."
                }
            ]
        },
        {
            title: "Exterior Washing & Safe Paint Care",
            icon: <Sparkles className="w-5 h-5 text-purple-500" />,
            questions: [
                {
                    q: "What are 'swirl marks' and how do you prevent them?",
                    a: "Swirl marks are thousands of fine scratches caused by improper washing techniques, such as using a single bucket or dirty sponges. These scratches refract light, making paint look dull. We prevent them by using a thorough pre-rinse, foam cannons to lift dirt, and high-lubricity shampoos that encapsulate grit before it touches your paint."
                },
                {
                    q: "Why do you use a clay bar on my paint?",
                    a: "Over time, contaminants like brake dust, industrial fallout, and tree sap bond to your paint, making it feel rough like sandpaper. Washing alone cannot remove these bonded particles. A clay bar treatment mechanically sheers off this embedded contamination, leaving the glass-smooth surface necessary for wax or ceramic coatings to bond properly."
                },
                {
                    q: "Is it safe to use dish soap on my car?",
                    a: "Dish soap is designed to strip stubborn grease from pots and pans, which means it is too aggressive for automotive paint. It strips away wax and sealants, leaving your clear coat unprotected and prone to oxidation. We use pH-neutral automotive shampoos that clean effectively while preserving your existing protection."
                }
            ]
        },
        {
            title: "Paint Correction & Polishing",
            icon: <ShieldCheck className="w-5 h-5 text-green-500" />,
            questions: [
                {
                    q: "What does 'paint correction' actually do?",
                    a: "Paint correction is the process of permanently removing surface imperfections like swirl marks, scratches, and etching. By using specialized machines and abrasive compounds, we safely level the microscopic peaks and valleys of the clear coat. This restores true calibrated reflection and depth, rather than just temporarily filling scratches with glaze."
                },
                {
                    q: "Will polishing damage my clear coat?",
                    a: "When performed by a professional, polishing is safe. We measure paint depth before starting to ensure there is enough clear coat to work with. The goal is to remove the minimum amount of material necessary—often less than the thickness of a post-it note—to reveal a fresh, defect-free layer beneath."
                },
                {
                    q: "How often should my vehicle be polished?",
                    a: "Paint correction is usually a one-time or infrequent service (every 2-3 years) provided the vehicle is maintained correctly afterwards. Once the paint is corrected and ceramic coated, proper maintenance washing will prevent new scratches from forming, negating the need for frequent polishing."
                }
            ]
        },
        {
            title: "Ceramic Coatings & Protection",
            icon: <ShieldCheck className="w-5 h-5 text-amber-500" />,
            questions: [
                {
                    q: "How is a ceramic coating different from wax?",
                    a: "Wax is a natural or synthetic layer that sits on top of the paint and lasts a few weeks to months. Ceramic coatings (SiO2) form a semi-permanent chemical bond with the paint, creating a hardened sacrificial layer. This offers superior rigorous protection against UV rays, bird droppings, and chemicals for years, not weeks."
                },
                {
                    q: "Does a ceramic coating make my car scratch-proof?",
                    a: "No coating makes a car scratch-proof. However, ceramic coatings are harder than factory clear coat, offering increased resistance to light marring and wash-induced swirls. Their primary benefit is 'hydrophobicity' (water repellency) and self-cleaning properties, which make maintaining a scratch-free finish significantly easier."
                },
                {
                    q: "Why does a ceramic coating cost more than a wax?",
                    a: "The cost reflects the intensive labor required for preparation, not just the product. Before coating, paint must be perfectly clean, decontaminated, and usually polished to remove defects. Applying a coating over scratches locks them in. The application itself requires strict temperature control and precise timing to cure correctly."
                }
            ]
        },
        {
            title: "Interior Detailing & Materials",
            icon: <BookOpen className="w-5 h-5 text-indigo-500" />,
            questions: [
                {
                    q: "Why shouldn't I use shiny dressings on my dashboard?",
                    a: "Cheap, high-gloss dressings often contain petroleum and silicone oils that attract dust and can amplify UV heat, leading to dashboard cracking over time. They also create a greasy film that can off-gas and fog your windshield. We use water-based, dry-to-the-touch protectants that offer UV screening without the sticky residue."
                },
                {
                    q: "How do you clean leather safely?",
                    a: "Leather requires a delicate balance; harsh chemicals can strip the factory protective coating and dry out the hide, causing cracks. We use dedicated leather cleaners followed by conditioners that restore hydration and suppleness. This keeps the leather matte and grippy, rather than shiny and slippery."
                },
                {
                    q: "Can you remove every stain from my upholstery?",
                    a: "While we use commercial-grade hot water extraction and enzymatic cleaners, some stains can become permanent if they have dyed the fabric fibers. Our process removes all suspended dirt and sanitizes the area, but if a substance (like some berries or dyes) has chemically altered the fabric color, it may not fully reverse."
                }
            ]
        },
        {
            title: "Wheels, Tires & Engine Bay",
            icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
            questions: [
                {
                    q: "My wheels have black dust that won't wash off. What is it?",
                    a: "That is brake dust—hot iron particles from your brake pads that embed themselves into the wheel finish. Standard soap won't remove it. We use pH-neutral iron removers that chemically react with the metal, turning purple as they dissolve the particles safely without scrubbing that could scratch the rim."
                },
                {
                    q: "Is it safe to wash an engine bay?",
                    a: "Yes, modern engines are weather-sealed, but they require caution. We do not use high-pressure water directly on sensitive components like alternators or fuse boxes. Instead, we use steam and gentle agitation with degreasers, followed by a dressing that protects hoses and plastics from drying out and cracking."
                },
                {
                    q: "Why do my tires look brown?",
                    a: "Before applying tire shine, tires must be deep cleaned. The brown appearance is 'blooming,' which is antiozonant pushing to the surface. If you layer tire shine over this without cleaning, it creates a brown sludge. We strip the tires clean first so the dressing bonds to the rubber, preventing sling and lasting weeks."
                }
            ]
        },
        {
            title: "DIY Risks & Misconceptions",
            icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
            questions: [
                {
                    q: "Why are automatic car washes bad for my car?",
                    a: "Touch-based automatic washes use rapidly spinning brushes that hold dirt from previous cars, effectively sanding your paint with every rotation. Even 'touchless' washes use extremely aggressive acids and alkalines to clean without scrubbing, which strip your wax and dry out your plastic trim and rubber seals."
                },
                {
                    q: "Start-up detailers charge less. Why?",
                    a: "Proper detailing is expensive due to the cost of insurance, high-quality chemicals, and the time required to do the job safely. Cheaper services often skip critical steps (like decontamination) or use aggressive bulk chemicals to speed up the process, which can cause long-term damage that costs more to fix than the initial savings."
                },
                {
                    q: "Does 'Dealer Prep' count as detailing?",
                    a: "Rarely. Dealerships focus on volume and speed. 'Dealer prep' often involves a quick wash and a glaze that temporarily hides scratches. It is common for new cars to need professional correction immediately after purchase to remove swirl marks installed during the dealership's initial wash process."
                }
            ]
        }
    ];

    return (
        <section className="py-20 bg-slate-50 border-t border-zinc-200">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
                        <BookOpen className="w-4 h-4" />
                        Educational Resources
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Professional Detailing vs. <span className="text-blue-600">DIY Car Care</span>
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Understanding the science behind professional car care. We believe an educated customer sees the value in proper maintenance.
                    </p>
                </div>

                <div className="space-y-8">
                    {categories.map((category, idx) => (
                        <Card key={idx} className="overflow-hidden border-0 shadow-sm bg-white ring-1 ring-slate-100">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm ring-1 ring-slate-100">
                                    {category.icon}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{category.title}</h3>
                            </div>
                            <div className="p-2">
                                <Accordion type="single" collapsible className="w-full">
                                    {category.questions.map((item, qIdx) => (
                                        <AccordionItem
                                            key={qIdx}
                                            value={`cat-${idx}-q-${qIdx}`}
                                            className="border-b border-slate-50 last:border-0"
                                        >
                                            <AccordionTrigger className="px-6 py-4 hover:bg-slate-50 transition-colors text-left font-medium text-slate-700 hover:text-blue-600 hover:no-underline">
                                                {item.q}
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6 pb-6 pt-2 text-slate-600 leading-relaxed bg-slate-50/50">
                                                {item.a}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-sm text-slate-400 font-medium italic">
                        Our goal is to preserve your vehicle's value, not just make it shiny for a day.
                    </p>
                </div>
            </div>
        </section>
    );
};
