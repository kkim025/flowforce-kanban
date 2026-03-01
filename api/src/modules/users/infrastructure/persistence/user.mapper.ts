import { User as PrismaUser, Prisma } from "@prisma/client";
import { User } from "../../domain/user.entity";
import { Email } from "../../domain/email.value-object";

export class UserMapper {
  public static toDomain(raw: PrismaUser): User {
    const emailResult = Email.create(raw.email);
    if (emailResult.isFailure) {
      throw new Error("Invalid email in database");
    }

    const userResult = User.create(
      {
        email: emailResult.getValue(),
        password: raw.password,
        name: raw.name || undefined,
      },
      raw.id
    );

    return userResult.getValue();
  }

  public static toPersistence(user: User): Prisma.UserCreateInput {
    return {
      id: user.id,
      email: user.email.value,
      password: user.password,
      name: user.name || null,
    };
  }
}
