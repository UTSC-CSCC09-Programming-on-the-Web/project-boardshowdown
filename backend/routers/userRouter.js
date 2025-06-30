import { Router } from "express";
import { client } from "../datasource.js";
import { userQuery } from "../queries/userQuery.js";

export const userRouter = Router();

// Get user by ID
userRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await client.query(userQuery.getUserByIdQuery, [id]);
        
        if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: "User not found"
        });
        }
        
        res.json({
        success: true,
        data: result.rows[0]
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
        success: false,
        error: "Failed to fetch user"
        });
    }
    });

// Create a new user
userRouter.post("/", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: "Username and password are required"
            });
        }
        
        const result = await client.query(userQuery.createUserQuery, [username, password]);
        
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create user"
        });
    }
});

// Update user by ID
userRouter.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password } = req.body;
        
        if (!username && !password) {
            return res.status(400).json({
                success: false,
                error: "At least one field (username or password) is required"
            });
        }
        
        const result = await client.query(userQuery.updateUserQuery, [username, password, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update user"
        });
    }
});

// Delete user by ID
userRouter.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await client.query(userQuery.deleteUserQuery, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        
        res.json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete user"
        });
    }
});

// Get all users
userRouter.get("/", async (req, res) => {
    try {
        const result = await client.query(userQuery.getAllUsersQuery);
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch users"
        });
    }
}); 

// Get user by username
userRouter.get("/username/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const result = await client.query(userQuery.getUserByUsernameQuery, [username]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error fetching user by username:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user by username"
        });
    }
});


