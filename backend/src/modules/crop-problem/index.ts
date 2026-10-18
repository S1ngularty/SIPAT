import { CropProblemRepository } from "./cropProblem.repository.js";
import { CropProblemService } from "./cropProblem.service.js";
import { CropProblemController } from "./cropProblem.controller.js";

export const cropProblemRepository = new CropProblemRepository();
export const cropProblemService = new CropProblemService(cropProblemRepository);
export const cropProblemController = new CropProblemController(
  cropProblemService,
);
