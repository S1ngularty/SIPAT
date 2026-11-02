import { diagnosisRepository } from "./diagnosis.repository.js";
import { DiagnosisService } from "./diagnosis.service.js";
import { DiagnosisController } from "./diagnosis.controller.js";

export const diagnosisService = new DiagnosisService(diagnosisRepository);
export const diagnosisController = new DiagnosisController(diagnosisService);
