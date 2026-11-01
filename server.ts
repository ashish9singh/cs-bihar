import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '2mb' }));

// Initialize GoogleGenAI SDK on server side
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `
आप बिहार विद्यालय परीक्षा समिति (BSEB) के कक्षा 9, 10, 11 और 12 के छात्रों के लिए एक वरिष्ठ कंप्यूटर साइंस शिक्षक (Senior Computer Science Teacher) और एआई मार्गदर्शक हैं।
एप्लिकेशन का नाम: "BSEBwala.in – Bihar Board Computer Science AI Learning Companion"
टैगलाइन: "सीखिए Computer Science, समझिए अपनी भाषा में!"

शिक्षण शैली और निर्देश:
1. भाषा: मुख्य व्याख्या सरल, आत्मीय और सम्मानजनक हिंदी में होगी। तकनीकी शब्दावली (Technical Terms जैसे Variable, Loop, RAM, ROM, Primary Key, LAN, WAN, IP Address आदि) को मानक अंग्रेजी में लिखें।
2. प्रोग्रामिंग सिंटैक्स (C++, SQL, HTML) शुद्ध और मानक अंग्रेजी में होगा।
3. उदाहरण: भारतीय और बिहार के वास्तविक दैनिक जीवन के जाने-पहचाने उदाहरण दें (जैसे: डाकघर और पता, विद्यालय की हाजिरी पंजी, राशन वितरण, रेलवे आरक्षण, बिजली का स्विच आदि)।
4. आदरसूचक और उत्साहवर्धक भाषा का प्रयोग करें:
   - "आइए, समझते हैं।"
   - "अब ध्यान दीजिए।"
   - "मान लीजिए..."
   - "बहुत अच्छा! आपने सही समझा।"
   - "यदि अभी स्पष्ट नहीं हुआ है, तो एक और उदाहरण देखते हैं।"
5. यदि छात्र किसी प्रोग्राम में एरर पूछे, तो एरर का कारण और उसे ठीक करने का तरीका सरल हिंदी में समझाएं।
6. यदि कोड दें, तो कोड के बाद मुख्य लाइनों का मतलब क्रमवार समझाएं।
7. उत्तर के अंत में छात्र की समझ जांचने के लिए एक छोटा सा उत्साहवर्धक प्रश्न पूछें।
8. कभी भी गलत या मनगढ़ंत पाठ्यक्रम/तथ्य न बताएं।
`;

// Fallback response generator in case API key is missing or quota exceeded
function getLocalFallbackResponse(userPrompt: string, classGrade?: string): string {
  const query = userPrompt.toLowerCase();
  
  if (query.includes('variable') || query.includes('वेरिएबल')) {
    return `आइए, समझते हैं! **Variable (वेरिएबल)** क्या होता है:

मान लीजिए आपके घर की रसोई में दाल, चीनी और नमक के अलग-अलग डिब्बे हैं। हर डिब्बे पर एक लेबल लगा है और उसके अंदर कोई सामान रखा जाता है।

कंप्यूटर में **Variable** भी बिल्कुल एक डिब्बे (कंटेनर) की तरह होता है, जो कंप्यूटर की मेमोरी (RAM) में किसी डेटा को सुरक्षित रखने के लिए बनाया जाता है।

**उदाहरण (C++ में):**
\`\`\`cpp
int age = 16;
\`\`\`
- \`int\` (Data Type): यह बताता है कि डिब्बे में केवल पूर्णांक (Integer) संख्या रखी जाएगी।
- \`age\` (Variable Name): यह उस डिब्बे का नाम है।
- \`16\` (Value): यह वह मान है जो डिब्बे में रखा गया है।

**अब ध्यान दीजिए:** प्रोग्राम के चलते समय हम इस डिब्बे की वैल्यू बदल भी सकते हैं, इसीलिए इसे "Variable" (परिवर्तनशील) कहते हैं।

क्या आप बता सकते हैं कि यदि हमें छात्र का नाम स्टोर करना हो, तो कौन सा Data Type इस्तेमाल करेंगे?`;
  }

  if (query.includes('ram') || query.includes('rom')) {
    return `आइए, **RAM और ROM के अंतर** को एक सरल उदाहरण से समझते हैं:

मान लीजिए आप स्कूल में परीक्षा दे रहे हैं:
1. **RAM (Random Access Memory):** यह आपकी परीक्षा की **रफ कॉपी** या ब्लैकबोर्ड की तरह है। जब तक घंटी बजती है (या कंप्यूटर चालू रहता है), आप इस पर तुरंत लिखते और मिटाते हैं। जैसे ही बिजली (Power) बंद होती है, RAM का सारा डेटा मिट जाता है। इसीलिए इसे **Volatile (अस्थायी) Memory** कहते हैं।
2. **ROM (Read Only Memory):** यह आपकी **छपी हुई पाठ्य-पुस्तक (Textbook)** की तरह है। इसमें लिखी बातें कंपनी द्वारा पहले ही लिख दी जाती हैं। कंप्यूटर बंद होने पर भी इसमें लिखा डेटा कभी नहीं मिटता। इसे **Non-Volatile (स्थायी) Memory** कहते हैं।

**मुख्य अंतर सारणी:**
| विशेषता | RAM | ROM |
| :--- | :--- | :--- |
| पूरा नाम | Random Access Memory | Read Only Memory |
| प्रकृति | Volatile (अस्थायी) | Non-Volatile (स्थायी) |
| गति | अत्यंत तीव्र | अपेक्षाकृत धीमी |
| कार्य | वर्तमान चालू प्रोग्राम्स को चलाना | कंप्यूटर बूटिंग (BIOS) निर्देश |

बहुत अच्छा! क्या अब आप बता सकते हैं कि जब आप मोबाइल में गेम खेल रहे होते हैं, तब वह RAM में चल रहा होता है या ROM में?`;
  }

  if (query.includes('loop') || query.includes('फॉर लूप') || query.includes('लूप')) {
    return `आइए, **Loop (लूप)** की अवधारणा को समझते हैं:

मान लीजिए शिक्षक महोदय ने आपसे कहा - "अपनी कॉपी में 1 से लेकर 100 तक गिनती लिखिए।"
यदि आप बिना लूप के कोड लिखेंगे, तो आपको 100 बार \`cout\` लिखना पड़ेगा! लेकिन लूप की मदद से हम कंप्यूटर को सिर्फ एक निर्देश देते हैं: "शुरू करो 1 से, हर बार 1 बढ़ाओ, और 100 तक दोहराते रहो।"

**C++ में for loop का प्रारूप:**
\`\`\`cpp
for (int i = 1; i <= 5; i++) {
    cout << "नमस्ते बिहार! " << i << endl;
}
\`\`\`

**अब ध्यान दीजिए (लाइन-बाय-लाइन व्याख्या):**
1. \`int i = 1;\` -> Initialization (शुरुआती बिंदु: i का मान 1 तय हुआ)।
2. \`i <= 5;\` -> Condition (शर्त: जब तक i का मान 5 या उससे छोटा है, लूप चलेगा)।
3. \`i++\` -> Increment (हर चक्र के बाद i में 1 की वृद्धि होगी)।

**आउटपुट:**
\`\`\`text
नमस्ते बिहार! 1
नमस्ते बिहार! 2
नमस्ते बिहार! 3
नमस्ते बिहार! 4
नमस्ते बिहार! 5
\`\`\`

क्या आप बता सकते हैं कि यदि हम \`i++\` की जगह \`i = i + 2\` लिख दें, तो लूप कितनी बार चलेगा?`;
  }

  if (query.includes('primary key') || query.includes('प्राइमरी की') || query.includes('sql') || query.includes('select')) {
    return `आइए, समझते हैं! डेटाबेस में **Primary Key** क्या होती है:

मान लीजिए आपके विद्यालय में दो छात्रों का नाम 'राहुल कुमार' हो सकता है और दोनों कक्षा 11 में पढ़ते हों। अब शिक्षक महोदय उन्हें अलग-अलग कैसे पहचानेंगे? 
**उनके Roll Number से!** क्योंकि प्रत्येक छात्र का रोल नंबर यूनिक (अद्वितीय) होता है और किसी का रोल नंबर खाली (Blank) नहीं हो सकता।

डेटाबेस में **Primary Key** टेबल के उस कॉलम को कहते हैं जो:
1. हर रिकॉर्ड को विशिष्ट (Unique) रूप से पहचानता है।
2. कभी भी खाली (NULL) नहीं हो सकता।
3. एक टेबल में केवल एक ही Primary Key हो सकती है।

**SQL उदाहरण:**
\`\`\`sql
CREATE TABLE STUDENT (
    Roll_No INT PRIMARY KEY,
    Name VARCHAR(50),
    Class INT,
    Marks INT
);
\`\`\`

**यहाँ ध्यान दीजिए:** \`Roll_No\` को हमने PRIMARY KEY बनाया है। अब यदि कोई छात्र बिना रोल नंबर के प्रवेश करना चाहे या एक ही रोल नंबर दोबारा डालना चाहे, तो डेटाबेस उसे अस्वीकार कर देगा।

क्या आप बता सकते हैं कि हमारे आधार कार्ड (Aadhaar Number) को Primary Key क्यों माना जा सकता है?`;
  }

  return `नमस्कार विद्यार्थी! आइए आपके इस प्रश्न को समझते हैं।

आपने पूछा है: **"${userPrompt}"**

**अवधारणा (Concept) की सरल व्याख्या:**
कंप्यूटर साइंस में किसी भी कठिन विषय को यदि हम अपने दैनिक जीवन के उदाहरणों से जोड़कर समझें, तो वह बहुत आसान हो जाता है। 
- कंप्यूटर एक इलेक्ट्रॉनिक उपकरण है जो इनपुट लेता है, प्रोसेस करता है और आउटपुट देता है।
- प्रोग्रामिंग भाषा कंप्यूटर से बात करने का माध्यम है। जैसे हम आपस में हिंदी में बात करते हैं, वैसे ही कंप्यूटर को निर्देश देने के लिए C++, Python, या SQL का प्रयोग किया जाता है।

**महत्वपूर्ण सूत्र / परीक्षा टिप (BSEB):**
1. हमेशा मुख्य तकनीकी शब्दों को अंग्रेजी में याद रखें और परिभाषा को सरल हिंदी में समझें।
2. C++ में हर निर्देश के बाद सेमीकोलन (\`;\`) लगाना न भूलें।
3. परीक्षा में उदाहरण और फ्लोचार्ट/ब्लॉक डायग्राम बनाने से पूरे अंक मिलते हैं।

आइए, अब आप स्वयं प्रयास कीजिए - क्या आप इस विषय से जुड़ा कोई विशेष उदाहरण या प्रोग्राम देखना चाहते हैं?`;
}

// Conversational Chat Endpoint for AI Tutor
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, classGrade, topic, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'संदेश (Message) आवश्यक है।' });
    }

    // If Gemini is available, call it
    if (ai && process.env.GEMINI_API_KEY) {
      try {
        let contextPrefix = '';
        if (classGrade) {
          contextPrefix += `[छात्र की कक्षा: ${classGrade}] `;
        }
        if (topic) {
          contextPrefix += `[संबंधित विषय/चैप्टर: ${topic}] `;
        }

        let historyPrompt = '';
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          const recentHistory = conversationHistory.slice(-4);
          historyPrompt = recentHistory
            .map((h: { sender: string; text: string }) => `${h.sender === 'user' ? 'छात्र' : 'शिक्षक'}: ${h.text}`)
            .join('\n') + '\n\n';
        }

        const fullPrompt = `${contextPrefix}\n${historyPrompt}छात्र का प्रश्न: ${message}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: fullPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });

        const reply = response.text || getLocalFallbackResponse(message, classGrade);
        return res.json({ reply, source: 'gemini' });
      } catch (geminiError: any) {
        console.warn('Gemini API notice, using high-quality curriculum fallback:', geminiError?.message);
        const fallbackReply = getLocalFallbackResponse(message, classGrade);
        return res.json({ reply: fallbackReply, source: 'fallback' });
      }
    } else {
      // Offline fallback mode
      const fallbackReply = getLocalFallbackResponse(message, classGrade);
      return res.json({ reply: fallbackReply, source: 'local' });
    }
  } catch (error: any) {
    console.error('Server /api/chat error:', error);
    return res.status(500).json({
      error: 'सर्वर पर प्रश्न प्रोसेस करने में समस्या हुई। कृपया पुनः प्रयास करें।',
    });
  }
});

// Explain C++ code endpoint
app.post('/api/cplusplus/explain', async (req: Request, res: Response) => {
  try {
    const { code, title } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (ai && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `कृपया नीचे दिए गए C++ प्रोग्राम ("${title || 'C++ Code'}") की प्रत्येक महत्वपूर्ण पंक्ति को बिहार बोर्ड के छात्रों के लिए सरल हिंदी में पंक्ति-दर-पंक्ति समझाइए:
\`\`\`cpp
${code}
\`\`\`
व्याख्या का प्रारूप:
1. प्रोग्राम का मुख्य उद्देश्य
2. पंक्ति-दर-पंक्ति व्याख्या (Line by Line Explanation in Hindi)
3. छात्र ध्यान दें (Important Tip)`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });

        return res.json({ explanation: response.text });
      } catch (err: any) {
        console.warn('Gemini explain error, fallback to structured explanation');
      }
    }

    // Standard high-quality local breakdown if Gemini offline
    return res.json({
      explanation: `**प्रोग्राम का उद्देश्य:** यह C++ प्रोग्राम मानक इनपुट/आउटपुट और नियंत्रण संरचनाओं को प्रदर्शित करता है।

**पंक्ति-दर-पंक्ति व्याख्या:**
- \`#include <iostream>\`: यह हेडर फाइल है जो इनपुट (\`cin\`) और आउटपुट (\`cout\`) की सुविधाएं प्रदान करती है।
- \`using namespace std;\`: मानक C++ लाइब्रेरी के नामस्थान (Namespace) को सीधे प्रयोग करने की अनुमति देता है।
- \`int main()\`: यह मुख्य फ़ंक्शन है जहाँ से प्रोग्राम का निष्पादन (Execution) आरंभ होता है।
- \`cout << ...\`: यह स्क्रीन पर संदेश या मान प्रदर्शित (Print) करने का काम करता है।
- \`return 0;\`: यह ऑपरेटिंग सिस्टम को संकेत देता है कि प्रोग्राम बिना किसी त्रुटि के सफलतापूर्वक समाप्त हो गया।

**विद्यार्थी ध्यान दें:** C++ में प्रत्येक निर्देश के अंत में सेमीकोलन (\`;\`) लगाना अनिवार्य है।`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to explain code' });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'BSEBwala.in',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BSEB CS Server] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
