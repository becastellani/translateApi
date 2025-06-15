import { Router } from "express";
import validator from "../middlewares/validator.js";
import translateValidator from "./translateValidator.js";
import { restrictToConsumer } from "../middlewares/networkRestrict.js";

import { 
  createTranslate, 
  getTranslateStatus, 
  getAllTranslations, 
  updateTranslateStatus 
} from "../controllers/translateController.js";


const router = Router();
router.get("/", getAllTranslations);
router.get("/:requestId", getTranslateStatus);
router.post("/", validator(translateValidator), createTranslate);
router.put("/:requestId/status", restrictToConsumer, updateTranslateStatus);

export default router;