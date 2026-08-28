import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Generate Routine endpoint
app.post("/api/ai/generate-routine", async (req, res) => {
  try {
    const { goal, level, equipment, durationMinutes, focusArea } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are an elite calisthenics and gymnastics strength coach.
Create a structured, scientifically periodized calisthenics routine for:
- Goal: ${goal || "General Strength & Hypertrophy"}
- Fitness Level: ${level || "Intermediate"}
- Available Equipment: ${equipment || "Pull-up bar, Dip station, Floor"}
- Target Workout Duration: ${durationMinutes || 30} minutes
- Focus Muscle/Skill: ${focusArea || "Full Body"}

Provide 4 to 7 exercises. Each exercise must match standard calisthenics movements (Push-ups, Pull-ups, Dips, Muscle-ups, Pike push-ups, Planks, L-sits, Hollow body hold, Pistol squats, Bodyweight squats, Australian pull-ups, Hanging leg raises).
For each exercise include:
1. Exact exercise name
2. Category ('push' | 'pull' | 'core' | 'legs' | 'skill')
3. Sets (number)
4. Reps per set (number) or Hold duration in seconds for static holds
5. Is static hold boolean
6. Rest between sets in seconds
7. Primary form cue
8. Key joint angle focus (e.g., 'Elbow angle < 90 deg at bottom', 'Straight line from shoulder to heel')
9. Audio coaching voice prompt reminder`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a master calisthenics coach providing structured JSON workout routines.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            targetLevel: { type: Type.STRING },
            estimatedMinutes: { type: Type.NUMBER },
            warmupCues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  targetSets: { type: Type.NUMBER },
                  targetReps: { type: Type.NUMBER },
                  isHold: { type: Type.BOOLEAN },
                  holdDurationSeconds: { type: Type.NUMBER },
                  restSeconds: { type: Type.NUMBER },
                  primaryCue: { type: Type.STRING },
                  angleTarget: { type: Type.STRING },
                  voiceCue: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                },
                required: ["id", "name", "category", "targetSets", "targetReps", "restSeconds", "primaryCue", "voiceCue"],
              },
            },
            coachingTip: { type: Type.STRING },
          },
          required: ["title", "description", "estimatedMinutes", "exercises", "coachingTip"],
        },
      },
    });

    const text = response.text || "{}";
    const routineData = JSON.parse(text);
    res.json({ success: true, routine: routineData });
  } catch (error: any) {
    console.error("Error generating routine:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate routine" });
  }
});

// AI Post-Workout Biomechanical Analysis endpoint
app.post("/api/ai/analyze-workout", async (req, res) => {
  try {
    const { workoutSummary, exerciseStats, repBreakdown, formViolations } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are an Olympic Gymnastics & Calisthenics Biomechanics Coach.
Analyze the following recorded calisthenics workout performance data:

Workout Title: ${workoutSummary?.title || "Calisthenics Session"}
Total Duration: ${workoutSummary?.durationFormatted || "N/A"}
Total Reps Completed: ${workoutSummary?.totalReps || 0}
Average Form Quality Score: ${workoutSummary?.averageFormScore || 0}%

Exercise Breakdown:
${JSON.stringify(exerciseStats, null, 2)}

Observed Form Violations / Faults:
${JSON.stringify(formViolations, null, 2)}

Detailed Rep Breakdown sample:
${JSON.stringify((repBreakdown || []).slice(0, 20), null, 2)}

Provide an in-depth, supportive, yet scientifically rigorous biomechanical feedback report with:
1. Overall Letter Grade (A+, A, B+, B, C, D)
2. Summary critique of the execution
3. 3 Key Biomechanical Strengths observed
4. 3 Form Deficiencies / Energy Leaks with explanation of why they occur (e.g. anterior pelvic tilt, elbow flare, loss of scapular retraction)
5. 3 Actionable Corrective Drills / Progressions to practice before the next session
6. Recovery & next-workout progression recommendation`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a master biomechanist and calisthenics strength coach returning a structured JSON post-workout evaluation.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallGrade: { type: Type.STRING },
            summaryStatement: { type: Type.STRING },
            formScoreAssessment: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            energyLeaksAndFaults: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  flaw: { type: Type.STRING },
                  impact: { type: Type.STRING },
                  correction: { type: Type.STRING },
                },
                required: ["flaw", "impact", "correction"],
              },
            },
            correctiveDrills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drillName: { type: Type.STRING },
                  setsReps: { type: Type.STRING },
                  focusCue: { type: Type.STRING },
                },
                required: ["drillName", "setsReps", "focusCue"],
              },
            },
            progressionRecommendation: { type: Type.STRING },
            recoveryAdvice: { type: Type.STRING },
          },
          required: ["overallGrade", "summaryStatement", "strengths", "energyLeaksAndFaults", "correctiveDrills", "progressionRecommendation"],
        },
      },
    });

    const text = response.text || "{}";
    const analysisData = JSON.parse(text);
    res.json({ success: true, analysis: analysisData });
  } catch (error: any) {
    console.error("Error analyzing workout:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to analyze workout" });
  }
});

// AI Exercise Technique Guide endpoint
app.post("/api/ai/exercise-tips", async (req, res) => {
  try {
    const { exerciseName } = req.body;
    const ai = getGeminiClient();

    const prompt = `Provide precise calisthenics technique breakdown and audio coaching cues for the exercise: "${exerciseName}".
Include setup, eccentric phase, bottom position, concentric phase, top lockout, common mistakes, and 4 short live voice cues.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a calisthenics technique specialist returning structured JSON advice.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            setupCues: { type: Type.ARRAY, items: { type: Type.STRING } },
            executionPhases: {
              type: Type.OBJECT,
              properties: {
                eccentric: { type: Type.STRING },
                inflectionPoint: { type: Type.STRING },
                concentric: { type: Type.STRING },
                lockout: { type: Type.STRING },
              },
              required: ["eccentric", "inflectionPoint", "concentric", "lockout"],
            },
            commonFaults: { type: Type.ARRAY, items: { type: Type.STRING } },
            instantVoiceCues: { type: Type.ARRAY, items: { type: Type.STRING } },
            regression: { type: Type.STRING },
            progression: { type: Type.STRING },
          },
          required: ["name", "setupCues", "executionPhases", "commonFaults", "instantVoiceCues"],
        },
      },
    });

    const text = response.text || "{}";
    res.json({ success: true, tips: JSON.parse(text) });
  } catch (error: any) {
    console.error("Error getting exercise tips:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get exercise tips" });
  }
});

// AI Interactive Coach Q&A Chat endpoint
app.post("/api/ai/coach-chat", async (req, res) => {
  try {
    const { messages, sessionContext } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are an elite Olympic gymnastics and calisthenics biomechanics coach.
You provide encouraging, technically precise, and actionable feedback based on biomechanical principles.
${
  sessionContext
    ? `The user just completed a workout with the following performance data:
Routine: ${sessionContext.routineTitle}
Duration: ${sessionContext.durationFormatted}
Total Reps: ${sessionContext.totalReps}
Average Form Score: ${sessionContext.averageFormScore}%
Form Violations Detected: ${JSON.stringify(sessionContext.formViolations || [])}
Biomechanical Analysis: ${JSON.stringify(sessionContext.aiAnalysis || {})}`
    : "The user is asking about calisthenics training, form mastery, exercise progressions, and injury prevention."
}
Keep answers concise, direct, supportive, and formatted with clean markdown bullet points. Avoid fluff or generic jargon.`;

    const chatContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: chatContents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const reply = response.text || "I'm here to help you refine your calisthenics form. What specific movement would you like to master?";
    res.json({ success: true, reply });
  } catch (error: any) {
    console.error("Error in coach chat:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get response from AI coach" });
  }
});

// AI Calisthenics Skill Roadmap Generator endpoint
app.post("/api/ai/skill-roadmap", async (req, res) => {
  try {
    const { targetSkill, currentLevel, availableEquipment } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are an elite calisthenics coach. Design a step-by-step master progression roadmap to achieve "${targetSkill}".
Current User Level: ${currentLevel || "Beginner / Intermediate"}
Available Equipment: ${availableEquipment || "Pull-up bar, Dip bars, Floor"}

Return a structured roadmap with:
1. Target Skill Name and overview
2. 5 progressive steps from current level to mastery
3. For each step: step number, title, prerequisite criteria to advance (e.g., "3x8 strict reps"), key biomechanical focus, and frequency
4. Top 3 common pitfalls/injuries to avoid during this progression
5. Recommended weekly training split structure`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a master calisthenics coach providing structured JSON skill progression roadmaps.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skillName: { type: Type.STRING },
            overview: { type: Type.STRING },
            estimatedTimeline: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  stepName: { type: Type.STRING },
                  exerciseName: { type: Type.STRING },
                  masteryCriteria: { type: Type.STRING },
                  keyCue: { type: Type.STRING },
                  recommendedSetsReps: { type: Type.STRING },
                },
                required: ["stepNumber", "stepName", "exerciseName", "masteryCriteria", "keyCue", "recommendedSetsReps"],
              },
            },
            pitfalls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            weeklySplitRecommendation: { type: Type.STRING },
          },
          required: ["skillName", "overview", "estimatedTimeline", "steps", "pitfalls", "weeklySplitRecommendation"],
        },
      },
    });

    const text = response.text || "{}";
    res.json({ success: true, roadmap: JSON.parse(text) });
  } catch (error: any) {
    console.error("Error generating skill roadmap:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate skill roadmap" });
  }
});

// Server and Vite setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Calisthenics Coach Server running on http://localhost:${PORT}`);
  });
}

startServer();
