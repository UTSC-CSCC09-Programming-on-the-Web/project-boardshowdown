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

// Create a new user (for Google OAuth only)
userRouter.post("/", async (req, res) => {
    try {
        const { email, username, name, profile_picture } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }

        const result = await client.query(userQuery.createUserQuery, [
            email,
            username || null,
            name || null,
            profile_picture || null
        ]);
        
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

// Update user by ID (for non-password fields only)
userRouter.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { email, username, name, profile_picture } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }
        
        const result = await client.query(userQuery.updateUserQuery, [
            email,
            username || null,
            name || null,
            profile_picture || null,
            id
        ]);
        
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

// Get user by email
userRouter.get("/email/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const result = await client.query(userQuery.getUserByEmailQuery, [email]);
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
        console.error("Error fetching user by email:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user by email"
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


