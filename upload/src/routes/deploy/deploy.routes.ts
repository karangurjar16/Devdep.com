// import { Router } from "express";
// import prisma from "../../prisma";

// const router = Router();

// router.post("/deploys/by-email", async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ error: "Email is required" });
//     }

//     const deploys = await prisma.deploy.findMany({
//       where: {
//         email: email
//       }
//     });

//     return res.status(200).json({
//       count: deploys.length,
//       data: deploys
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

// export default router;