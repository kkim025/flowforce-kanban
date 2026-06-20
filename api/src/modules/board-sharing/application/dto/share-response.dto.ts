export class ShareResponseDto {
  id: string;
  publicId: string;
  email: string;
  permissionLevel: string;
  status: string;
  invitedById: string;
  tokenExpiresAt: string;
  createdAt: string;
}

export class MemberResponseDto {
  id: string;
  publicId: string;
  boardId: string;
  userId: string;
  role: string;
  createdAt: string;
}
