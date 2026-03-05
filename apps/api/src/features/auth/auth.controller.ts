import { Request, Response } from "express";
import { ApplicationException } from "../../common/errors/application-exception";
import { Result } from "../../common/http/result";
import { signToken } from "./auth.middleware";
import { authService } from "./auth.service";

export const authController = {
  /**
   * @description Register a new user with email/password credentials.
   * @input name  string  , email : string , password : string
   * @returns 201 with created user + JWT token, or an error response.
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body as {
        name: string;
        email: string;
        password: string;
      };
      const user = await authService.register(name, email, password);
      res.status(201).json(
        Result.ok("Registration successful", {
          user,
          token: signToken(user.id),
        }),
      );
    } catch (error) {
      if (error instanceof ApplicationException) {
        res
          .status(error.statusCode)
          .json(Result.fail(error.message, error.code, error.details));
        return;
      }
      res
        .status(500)
        .json(Result.fail("Registration failed", "REGISTRATION_FAILED"));
    }
  },

  /**
   * @description Authenticate a usefailr using email/password.
   * @input req.body: { email: string; password: string }
   * @returns 200 with user + JWT token, or an error response.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as {
        email: string;
        password: string;
      };
      const user = await authService.login(email, password);
      res.json(
        Result.ok("Login successful", { user, token: signToken(user.id) }),
      );
    } catch (error) {
      if (error instanceof ApplicationException) {
        res
          .status(error.statusCode)
          .json(Result.fail(error.message, error.code, error.details));
        return;
      }
      res.status(500).json(Result.fail("Login failed", "LOGIN_FAILED"));
    }
  },

  /**
   * @description Fetch profile details of the authenticated user.
   * @input req.userId from auth middleware.
   * @returns 200 with user profile, or an error response.
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        throw new ApplicationException("Unauthorized", 401, "UNAUTHORIZED");
      }

      const user = await authService.me(req.userId);
      res.json(Result.ok("Profile fetched successfully", user));
    } catch (error) {
      if (error instanceof ApplicationException) {
        res
          .status(error.statusCode)
          .json(Result.fail(error.message, error.code, error.details));
        return;
      }
      res
        .status(500)
        .json(Result.fail("Failed to fetch profile", "PROFILE_FETCH_FAILED"));
    }
  },

  /**
   * @description Authenticate/login user via Google OAuth access token.
   * @input req.body: { accessToken: string }
   * @returns 200 with user + JWT token, or an error response.
   */
  async google(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken } = req.body as { accessToken: string };
      const user = await authService.google(accessToken);
      res.json(
        Result.ok("Google authentication successful", {
          user,
          token: signToken(user.id),
        }),
      );
    } catch (error) {
      if (error instanceof ApplicationException) {
        res
          .status(error.statusCode)
          .json(Result.fail(error.message, error.code, error.details));
        return;
      }
      res
        .status(401)
        .json(
          Result.fail("Google authentication failed", "GOOGLE_AUTH_FAILED"),
        );
    }
  },

  /**
   * @description Authenticate/login user via GitHub OAuth authorization code.
   * @input req.body: { code: string }
   * @returns 200 with user + JWT token, or an error response.
   */
  async github(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body as { code: string };
      const user = await authService.github(code);
      res.json(
        Result.ok("GitHub authentication successful", {
          user,
          token: signToken(user.id),
        }),
      );
    } catch (error) {
      if (error instanceof ApplicationException) {
        res
          .status(error.statusCode)
          .json(Result.fail(error.message, error.code, error.details));
        return;
      }
      res
        .status(401)
        .json(
          Result.fail("GitHub authentication failed", "GITHUB_AUTH_FAILED"),
        );
    }
  },
};
