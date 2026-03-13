import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateUserRoleDto {
  @IsEnum(["ADMIN", "MEMBER"])
  @IsNotEmpty()
  role: "ADMIN" | "MEMBER";
}
