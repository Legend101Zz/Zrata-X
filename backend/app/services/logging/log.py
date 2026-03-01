import logging
from datetime import datetime

PROMPT_LOG_FILE = "ai_prompt_logs.jsonl"

prompt_logger = logging.getLogger("ai_prompt_logger")
prompt_logger.setLevel(logging.INFO)

if not prompt_logger.handlers:
    file_handler = logging.FileHandler(PROMPT_LOG_FILE)
    file_handler.setFormatter(logging.Formatter('%(message)s'))
    prompt_logger.addHandler(file_handler)
