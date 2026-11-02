import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Create user with Guest role
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        phoneNumber: input.phone,
        role: 'Guest'
      }
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id.toString(),
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
        role: user.role
      },
      token
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id.toString(),
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phoneNumber,
        role: user.role
      },
      token
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      ...user,
      id: user.id.toString(),
      phone: user.phoneNumber
    };
  }

  private generateToken(payload: { userId: string; email: string; role: string }): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  }
}
