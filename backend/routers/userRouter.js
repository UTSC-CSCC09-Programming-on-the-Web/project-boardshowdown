import { Router } from "express";
import { client } from "../datasource.js";
import { userQuery } from "../queries/userQuery.js";
import bcrypt from "bcrypt";

export const userRouter = Router();

// Salt rounds for bcrypt (10 is a good balance of security and performance)
const SALT_ROUNDS = 10;

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
        
        // Remove password from response
        const userData = { ...result.rows[0] };
        delete userData.password;
        
        res.json({
        success: true,
        data: userData
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
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });
        }

        // Hash the password with salt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const result = await client.query(userQuery.createUserQuery, [email, hashedPassword]);
        
        // Remove password from response
        const userData = { ...result.rows[0] };
        delete userData.password;
        
        res.status(201).json({
            success: true,
            data: userData
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
        const { email, password } = req.body;
        
        if (!email && !password) {
            return res.status(400).json({
                success: false,
                error: "At least one field (email or password) is required"
            });
        }
        
        // Hash the password if it's being updated
        const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : password;
        
        const result = await client.query(userQuery.updateUserQuery, [email, hashedPassword, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }
        
        // Remove password from response
        const userData = { ...result.rows[0] };
        delete userData.password;
        
        res.json({
            success: true,
            data: userData
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
        
        // Remove passwords from all user objects
        const usersWithoutPasswords = result.rows.map(user => {
            const userData = { ...user };
            delete userData.password;
            return userData;
        });
        
        res.json({
            success: true,
            data: usersWithoutPasswords,
            count: usersWithoutPasswords.length
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
        
        // Remove password from response
        const userData = { ...result.rows[0] };
        delete userData.password;
        
        res.json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error("Error fetching user by email:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user by email"
        });
    }
});

// sign in user
userRouter.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });
        }
        
        // Get user by email
        const result = await client.query(userQuery.signInUserQuery, [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }
        
        const user = result.rows[0];
        
        // Compare the provided password with the hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }
        
        // Remove password from response
        const userData = { ...user };
        delete userData.password;
        
        res.json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error("Error signing in user:", error);
        res.status(500).json({
            success: false,
            error: "Failed to sign in user"
        });
    }
});


