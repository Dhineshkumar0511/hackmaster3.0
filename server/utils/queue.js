
/**
 * Simple In-Memory Job Queue for Evaluation
 * Prevents browser timeouts and blocks on heavy GitHub scans.
 */
class JobQueue {
    constructor() {
        this.jobs = new Map();
        this.queue = [];
        this.isProcessing = false;
        this.worker = null;
    }

    setWorker(workerFn) {
        this.worker = workerFn;
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

        // Trigger processing (it will check if already processing)
        this.process();

        return jobId;
    }

    getStatus(jobId) {
        return this.jobs.get(jobId);
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0 || !this.worker) return;

        this.isProcessing = true;
        const jobId = this.queue.shift();
        const job = this.jobs.get(jobId);

        if (!job) {
            this.isProcessing = false;
            this.process();
            return;
        }

        job.status = 'processing';
        console.log(`[JobQueue] Starting job ${jobId}...`);

        try {
            const result = await this.worker(job.data, job);
            job.status = 'completed';
            job.result = result;
            console.log(`[JobQueue] Job ${jobId} completed.`);
        } catch (err) {
            console.error(`[JobQueue] Job ${jobId} failed:`, err);
            job.status = 'failed';
            job.error = err.message;
        } finally {
            this.isProcessing = false;
            // Process next job in queue
            setTimeout(() => this.process(), 500); // 500ms breather between jobs
        }
    }
}

export const evaluationQueue = new JobQueue();
