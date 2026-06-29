output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.api.arn
}

output "api_endpoint" {
  description = "HTTP API endpoint URL"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "sqs_queue_url" {
  description = "SQS FIFO queue URL for writes"
  value       = aws_sqs_queue.write.url
}

output "sqs_queue_arn" {
  description = "SQS FIFO queue ARN"
  value       = aws_sqs_queue.write.arn
}

output "efs_filesystem_id" {
  description = "EFS filesystem ID"
  value       = aws_efs_file_system.main.id
}

output "region" {
  description = "AWS region"
  value       = data.aws_region.current.region
  depends_on  = [data.aws_region.current]
}
