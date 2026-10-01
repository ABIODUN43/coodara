# VIOLATION: Domain entity directly imports database connection layer!
from database.connection import DatabaseConnection

class OrderEntity:
    def __init__(self):
        self.db = DatabaseConnection()
