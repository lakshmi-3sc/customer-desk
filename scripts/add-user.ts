import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const addUser = async () => {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);

    const user = await prisma.user.create({
      data: {
        name: "Neha Sharma",
        email: "neha@colgate.com",
        password: hashedPassword,
        role: "CLIENT_ADMIN",
      },
    });

    console.log("User created successfully:", user);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      console.log("User already exists");
    } else {
      console.error("Error creating user:", error);
    }
  } finally {
    await prisma.$disconnect();
  }
};

addUser();
