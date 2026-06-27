export class ShareResponseDto {
  publicId: string;
  email: string;
  permissionLevel: string;
  status: string;
  invitedById: string;
  tokenExpiresAt: string;
  createdAt: string;
}

export class MemberResponseDto {
  publicId: string;
  boardId: string;
  userId: string;
  role: string;
  createdAt: string;
}
