# Persona Manager for AURA Voice AI
# Dynamic persona adaptation based on user preferences

import json
import logging
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime
import random

logger = logging.getLogger(__name__)

@dataclass
class PersonaProfile:
    """User's preferred communication style"""
    formality: str = "balanced"  # casual, balanced, professional
    detail_level: str = "normal"  # brief, normal, detailed
    example_style: str = "mixed"  # abstract, concrete, mixed
    questioning: str = "direct"  # direct, socratic, exploratory
    energy: str = "moderate"  # calm, moderate, enthusiastic
    confidence: float = 0.8  # Confidence in persona accuracy

class PersonaManager:
    def __init__(self):
        """Initialize persona management system"""
        self.personas = {}  # User ID -> PersonaProfile
        self.ab_tests = {}  # Track A/B testing results
        self.engagement_metrics = {}  # Track user engagement
        
        # Default persona templates
        self.templates = {
            "professional": {
                "system_prompt": "Respond in a professional, clear manner. Use industry terminology where appropriate.",
                "formality": "professional",
                "detail_level": "detailed"
            },
            "casual": {
                "system_prompt": "Be friendly and conversational. Use simple language and relatable examples.",
                "formality": "casual", 
                "detail_level": "brief"
            },
            "technical": {
                "system_prompt": "Provide technical depth. Include implementation details and best practices.",
                "formality": "balanced",
                "detail_level": "detailed"
            }
        }
        
        logger.info("Persona Manager initialized")
    
    async def get_persona(self, user_id: str) -> PersonaProfile:
        """Get or create persona for user"""
        if user_id not in self.personas:
            # Create default persona
            self.personas[user_id] = PersonaProfile()
            logger.info(f"Created default persona for user {user_id}")
        
        return self.personas[user_id]
    
    async def update_persona(
        self,
        user_id: str,
        feedback: Dict[str, any]
    ) -> PersonaProfile:
        """Update persona based on user feedback"""
        persona = await self.get_persona(user_id)
        
        # Track engagement metrics
        if user_id not in self.engagement_metrics:
            self.engagement_metrics[user_id] = {
                "sessions": 0,
                "avg_duration": 0,
                "satisfaction": []
            }
        
        metrics = self.engagement_metrics[user_id]
        metrics["sessions"] += 1
        
        # Update based on feedback signals
        if feedback.get("conversation_length", 0) > 5:  # Long conversation
            # User prefers detailed responses
            persona.detail_level = "detailed"
            persona.confidence = min(1.0, persona.confidence + 0.05)
        
        if feedback.get("follow_up_questions", 0) > 2:
            # User likes exploratory conversation
            persona.questioning = "exploratory"
        
        if feedback.get("requested_examples", False):
            # User prefers concrete examples
            persona.example_style = "concrete"
        
        # A/B test different styles
        if random.random() < 0.1:  # 10% chance to test
            await self._run_ab_test(user_id, persona)
        
        logger.info(f"Updated persona for user {user_id}: {asdict(persona)}")
        return persona
    
    async def _run_ab_test(self, user_id: str, current_persona: PersonaProfile):
        """Run A/B test with slightly different persona"""
        if user_id not in self.ab_tests:
            self.ab_tests[user_id] = {
                "tests_run": 0,
                "variations_tested": []
            }
        
        # Create variation
        test_persona = PersonaProfile(
            formality=current_persona.formality,
            detail_level=current_persona.detail_level,
            example_style=current_persona.example_style,
            questioning=current_persona.questioning,
            energy=current_persona.energy
        )
        
        # Vary one attribute
        variations = ["formality", "detail_level", "energy"]
        test_attribute = random.choice(variations)
        
        if test_attribute == "formality":
            options = ["casual", "balanced", "professional"]
            test_persona.formality = random.choice(
                [o for o in options if o != current_persona.formality]
            )
        
        self.ab_tests[user_id]["tests_run"] += 1
        logger.info(f"Running A/B test for user {user_id}, testing {test_attribute}")
    
    def generate_system_prompt(self, persona: PersonaProfile) -> str:
        """Generate LLM system prompt based on persona"""
        prompts = []
        
        # Formality
        if persona.formality == "casual":
            prompts.append("Be conversational and friendly. Use 'let's' and 'we' language.")
        elif persona.formality == "professional":
            prompts.append("Maintain professional tone. Use formal language.")
        
        # Detail level
        if persona.detail_level == "brief":
            prompts.append("Keep responses concise. Focus on key points.")
        elif persona.detail_level == "detailed":
            prompts.append("Provide comprehensive explanations with examples.")
        
        # Example style
        if persona.example_style == "concrete":
            prompts.append("Use real-world, practical examples.")
        elif persona.example_style == "abstract":
            prompts.append("Use conceptual and theoretical examples.")
        
        # Energy level
        if persona.energy == "enthusiastic":
            prompts.append("Show enthusiasm and energy in responses!")
        elif persona.energy == "calm":
            prompts.append("Maintain calm, measured tone.")
        
        return " ".join(prompts)
    
    async def apply_persona_to_message(
        self,
        message: str,
        user_id: str
    ) -> str:
        """Apply persona styling to message"""
        persona = await self.get_persona(user_id)
        system_prompt = self.generate_system_prompt(persona)
        
        # Inject persona into message context
        enhanced_message = f"""
        [System: {system_prompt}]
        
        User message: {message}
        
        Respond according to the system instructions above.
        """
        
        return enhanced_message
    
    async def get_persona_stats(self, user_id: str) -> Dict:
        """Get statistics about persona usage"""
        if user_id not in self.personas:
            return {"status": "no_persona"}
        
        persona = self.personas[user_id]
        metrics = self.engagement_metrics.get(user_id, {})
        tests = self.ab_tests.get(user_id, {})
        
        return {
            "persona": asdict(persona),
            "confidence": persona.confidence,
            "sessions": metrics.get("sessions", 0),
            "ab_tests_run": tests.get("tests_run", 0),
            "last_updated": datetime.now().isoformat()
        }
    
    async def reset_persona(self, user_id: str):
        """Reset user persona to defaults"""
        self.personas[user_id] = PersonaProfile()
        logger.info(f"Reset persona for user {user_id}")
    
    async def set_manual_persona(
        self,
        user_id: str,
        settings: Dict[str, str]
    ) -> PersonaProfile:
        """Manually set persona preferences"""
        persona = await self.get_persona(user_id)
        
        # Update allowed fields
        if "formality" in settings:
            persona.formality = settings["formality"]
        if "detail_level" in settings:
            persona.detail_level = settings["detail_level"]
        if "example_style" in settings:
            persona.example_style = settings["example_style"]
        if "energy" in settings:
            persona.energy = settings["energy"]
        
        # High confidence for manual settings
        persona.confidence = 1.0
        
        logger.info(f"Manual persona set for user {user_id}: {asdict(persona)}")
        return persona