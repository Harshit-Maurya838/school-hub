-- AlterEnum: preschool-only class ranges (Playway, Pre-Primary, or both)
ALTER TYPE "SchoolClassRange" ADD VALUE 'PLAYWAY_ONLY' BEFORE 'CLASS_1_TO_5';
ALTER TYPE "SchoolClassRange" ADD VALUE 'PRE_PRIMARY_ONLY' BEFORE 'CLASS_1_TO_5';
ALTER TYPE "SchoolClassRange" ADD VALUE 'PLAYWAY_AND_PRE_PRIMARY' BEFORE 'CLASS_1_TO_5';
