
/**
 * Simple In-Memory Job Queue for Evaluation
 * Prevents browser timeouts and blocks on heavy GitHub scans.
 */
class JobQueue {
    constructor() {
        this.jobs = new Map();
        this.queue = [];
        this.isProcessing = false;
    }

    add(jobData) {
        const jobId = Math.random().toString(36).substring(2, 15);
        const job = {
            id: jobId,
            status: 'pending',
            data: jobData,
            result: null,
            error: null,
            timestamp: Date.now()
        };
        this.jobs.set(jobId, job);
        this.queue.push(jobId);
        this.process();
        return jobId;
    }

    getStatus(jobId) {
        return this.jobs.get(jobId);
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        const jobId = this.queue.shift();
        const job = this.jobs.get(jobId);
        job.status = 'processing';

        try {
            // This is where the evaluation logic will go
            // For now, it's a placeholder that we'll call from server.js
            console.log(`Processing evaluation job: ${jobId}`);
        } catch (err) {
            job.status = 'failed';
            job.error = err.message;
        } finally {
            this.isProcessing = false;
            this.process();
        }
    }
}

export const evaluationQueue = new JobQueue();
