from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import os
import logging

logger = logging.getLogger(__name__)


class BaseProfileStore(ABC):
    """Abstract base class for ChronoGuard user memory stores."""

    @abstractmethod
    def load_profile(self, user_id: str) -> Dict[str, Any]:
        """Loads memory profile dictionary for the given user_id."""
        pass

    @abstractmethod
    def save_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
        """Saves memory profile dictionary for the given user_id."""
        pass


class InMemoryProfileStore(BaseProfileStore):
    """In-memory implementation of BaseProfileStore."""

    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def load_profile(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self._store:
            logger.info(f"Creating default memory profile for user {user_id} in InMemoryProfileStore.")
            self._store[user_id] = self._get_default_profile()
        return self._store[user_id]

    def save_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
        logger.info(f"Saving memory profile for user {user_id} in InMemoryProfileStore.")
        self._store[user_id] = profile

    def _get_default_profile(self) -> Dict[str, Any]:
        return {
            "average_focus": 0.0,
            "average_completion_rate": 0.0,
            "preferred_work_hours": [],
            "recurring_procrastination_patterns": [],
            "observations_count": 0
        }


# Determine the active profile store based on configuration
STORE_TYPE = os.getenv("STORE_TYPE", "in_memory").lower()

if STORE_TYPE == "firestore":
    # Placeholder for FirestoreProfileStore (implemented fully in Phase 8)
    # Falling back to InMemoryProfileStore if credentials or client fail to load.
    try:
        from google.cloud import firestore
        class FirestoreProfileStore(BaseProfileStore):
            def __init__(self):
                self.db = firestore.Client()
                self.collection_name = "user_memories"
                logger.info("Firestore client initialized successfully.")

            def load_profile(self, user_id: str) -> Dict[str, Any]:
                try:
                    doc = self.db.collection(self.collection_name).document(user_id).get()
                    if doc.exists:
                        return doc.to_dict()
                except Exception as e:
                    logger.error(f"Error loading from Firestore: {e}", exc_info=True)
                return InMemoryProfileStore()._get_default_profile()

            def save_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
                try:
                    self.db.collection(self.collection_name).document(user_id).set(profile)
                except Exception as e:
                    logger.error(f"Error saving to Firestore: {e}", exc_info=True)

        profile_store = FirestoreProfileStore()
    except Exception as e:
        logger.warning(f"Could not initialize FirestoreProfileStore: {e}. Falling back to InMemoryProfileStore.")
        profile_store = InMemoryProfileStore()
else:
    profile_store = InMemoryProfileStore()
