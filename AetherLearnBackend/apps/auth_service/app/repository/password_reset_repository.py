class PasswordResetRepository:
    """Repository wrapper for password reset token persistence."""

    def __init__(self, repo):
        self.repo = repo
