export interface LoginRequest {
  username: string;
  password: string;
  role: string;
  fcmToken: string;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  username: string;
  role: string;
  vendorId?: string;
  vendorName?: string;
  permissions?: string[];
}

export interface LoginResponse {
  success: boolean;
  data?: LoginData;
  accessToken?: string;
  refreshToken?: string;
  user?: UserDto;
  message?: string;
}
